---
title: so, you're building a type checker
date: 2026-05-31
tags: []
description: an overview of a cool data structure i implemented for mengine
draft: true
eleventyExcludeFromCollections: true
---

Say you're writing a compiler, or interpreter, or *anything* that needs to type check code. How do you know that it's legal to declare a variable at a particular point in the program?

For example:

```C
type Database;
type Table(db: Database);

{
    let prodDb: Database;
    {
        let users: Table(prodDb);
        // maybe you want to do some operations on users...
    }
    {
        let logs: Table(prodDb);
        // maybe you want to do some operations on logs...
    }
}
```

How do you know that you can actually declare `users` and `logs` where they appear? How do we know that we can't make a reference to `users` while declaring `logs`?

<img src="/assets/images/thoughtdumps/type-checker/nested-scope-diagram.png" alt="Nested lifetime diagram showing prodDb around users and logs, and an invalid reference between users and logs." width="620">

The diagram is drawing **lifetimes**, not just curly braces. Once `prodDb` is declared, it stays available until the surrounding block closes. `users` and `logs` each get their own shorter lifetime inside that region, so both can mention `prodDb`, but neither can see sideways into the other.

It feels fairly obvious to us, but how would you actually implement this? Moreover, typecheckers need to do these sorts of checks thousands to millions of times per program, so how do we make this efficient?

## solution 0: everyone's favorite? 

Brute force! Here's how we apply it here:
- if we're defining the variable `users: Table(prodDb)`, we just need to check that the type `Table(prodDb)` is well-defined where `users` is declared. 
- how do we know that `Table(prodDb)` is well-defined? We need to check that the type constructor `Table` is available there, and that its arguments (just `prodDb` in this case) are available there too.
- finally, if we "climb" outward through the surrounding regions, we can see that `prodDb` was declared earlier, and `Table` was declared as well.

<img src="/assets/images/thoughtdumps/type-checker/climbing-scopes-check.png" alt="Lifetime tree showing a check climbing outward from users to find Table and prodDb." width="360">

Ugh, how many times did I type "defined"? And we do this dance every single time we define a new variable, constructor, or type. There has to be a better way.

## the Boston Public Library

The other day, I received an invitation to two of my friends' weddings. I'm really excited for them! They're getting married at the Boston Public Library, a truly beautiful place of history. Naturally, because I am a very normal person, this made me think about data structures instead of, maybe, finding a date for the wedding.

But anyway, imagine you're standing in a library - not a small one, but a vast cathedral of books, with shelves stretching out in every direction imaginable. You're approached by a librarian, who has a very peculiar request.
 
"see this shelf?" she gestures at an enormous, empty shelf running the length of the room.

"...yeah?"


"well. I need you to fill it with books for me."

"...okay?"

"the books will arrive one at a time. When a book arrives, I'll tell you where to place it relative to a book that's already on the shelf -- to the right of this one, to the left of that one. You figure out exactly where it goes."

You nod slowly.

"sometimes a book will be removed. When that happens, take it off the shelf. You can burn it, or set it aside in a pile. I don't care."

"and?"

"and at any moment, I might ask you about two books: which one comes first?"

You stare at the shelf. It stretches into the distance, much longer than you could ever need. *why is it so big?*, you wonder. She hasn't told you how many books are coming. Maybe ten, maybe ten million. But the shelf -- the shelf has room for all of them, and then some.

You don't know it yet, but that's going to matter.

<img src="/assets/images/thoughtdumps/type-checker/wide-library-shelf.png" alt="A long library shelf with a few widely spaced books and a small overwhelmed figure." width="720">

You nod slowly.

## order-maintenance problem

So, why the detour? It turns out the librarian's shelf and our type checker are secretly the same problem. Stick with the shelf analogy for a second.

Every book on that shelf has a place: given any two of them, one sits to the left of the other. That defines a *total order*, and keeping one alive while books come and go is exactly the **order-maintenance problem**. Formally, it asks us to maintain a totally ordered set (for every `x != y`, either `x < y` or `y < x`) supporting three operations:

- `insert(X, Y)`, which inserts X immediately after Y in the total order;
- `order(X, Y)`, which determines if X precedes Y in the total order; and
- `delete(X)`, which removes X from the set.

Now, how could we actually implement this? 

The simplest solution is to use a linked list. To be fair, let's assume every operation is handed direct handles to the relevant nodes, so inserting `X` after `Y` and deleting `X` are both O(1). The problem is `order(X, Y)`: even with handles, the list does not tell us which node comes first. We still have to walk from one node until we either find the other one or hit the end. That's O(n), and `order` is exactly the query our type checker wants to ask over and over and over. Can we do better?

<img src="/assets/images/thoughtdumps/type-checker/linked-list-order.png" alt="Linked list from A to E with a small figure walking node by node to answer an order query." width="520">

Well, yes! In 1988, Dietz and Sleator gave a solution to this problem. Then in 2002, Bender et al. gave the world an *elegant* one called the *tag-range relabeling algorithm*.

The whole reason `order` was slow is that we had to walk the list to find where `X` and `Y` sit. So what if we just remembered? Bender et al. suggest that instead of storing elements in a linked list and walking it, we **assign a number to each element**. These numbers -- let's call them *tags* -- are just `uint64_t`s that encode position: if `X.tag < Y.tag`, then `X` comes before `Y`. 

So how do we hand out these tags?

Remember the librarian's shelf? It was *enormous*. Far bigger than she could ever need. That wasn't a throwaway detail. The shelf is so big because we're going to map it onto the range of a `uint64_t`, which gives us $2^{64}$ slots to work with. When the very first book arrives, we plop it down somewhere in the middle of that range. When the second book arrives -- say, immediately after the first -- we give it a tag halfway between the first book's tag and the end of the range. When the third book arrives between them, we give it a tag halfway between *those* two. And so on.

<img src="/assets/images/thoughtdumps/type-checker/tag-midpoint-number-line.png" alt="Number line from zero to two to the sixty fourth with books placed at spaced tag values and a new book assigned a midpoint." width="620">

Most of the time, this ends up working beautifully. You have a gap, you take the midpoint, you're done. O(1). 

But friends, nothing lasts forever. Eventually, you're going to *locally* run out of room. Some unlucky region of the shelf will have books packed tightly enough that there's no room between them. The gap is `0`, and you can't fit a new tag in there. *Now* what?

<img src="/assets/images/thoughtdumps/type-checker/crowded-number-line.png" alt="Crowded number line with books packed closely and a new book unable to fit between two tag values." width="650">

## remember ~~the alamo~~ amortized analysis?

We **relabel** to reach into that crowded region and spread the books out, redistributing their tags to make room. The cleverness is in *how much* of the shelf you relabel.

If every insertion triggered a global relabel of the entire shelf, we'd be doing O(n) work per insertion, and we'd be no better off than the linked list. So the algorithm picks a small window around the crowded spot, just big enough to be "sparse enough" to redistribute cleanly. It scans outward in exponentially growing ranges -- first 2 books, then 4, then 8, then 16, and at each scale, it checks: *is the density of this window below some threshold?* The threshold is carefully tuned so that whenever you find a window that passes the test, you can relabel just that window and your future self is guaranteed to have enough breathing room for a while.

The magic is in the amortized analysis. Any single insertion might trigger a relabel that touches O(log n) tags, but across many insertions, the cost can work out to O(log n) per insertion. Checking `order(X, Y)` becomes essentially free -- just compare two integers.

Deletion stays simple if each element also remembers its neighbors in tag order. To delete `X`, we splice it out of that neighbor chain: `X.prev.next = X.next`, `X.next.prev = X.prev`, and then `X`'s old tag simply disappears from the live set. No relabeling, no walking the line, just the same little pointer surgery a linked list would use.

<img src="/assets/images/thoughtdumps/type-checker/neighbor-pointers.png" alt="Zoomed-in number line showing a book with previous and next pointers to neighboring books." width="440">

So we have:

| operation | linked list | tag-range relabeling  |
|-----------|-------------|-----------------------|
| insert    | O(1)        | O(log n) amortized    |
| delete    | O(1)        | O(1)                  |
| order     | O(n)        | **O(1)**              |

So tag-range relabeling is not magically better at everything. We spend a little more on insertion, but in exchange, `order`, the one we're going to call millions of times, goes from O(n) to essentially free.

## back to the type checker

Now let's collect what we have. We've solved the librarian's problem: we can maintain a totally ordered sequence with cheap inserts, deletes, and order queries. But our type checker isn't asking about a totally ordered sequence -- it's asking whether one declaration is still alive when another declaration is being checked. How do we get from one to the other?

Order-maintenance lives on a line. Declaration lifetimes form a forest: `prodDb` starts before `users`, lasts through both inner blocks, and ends only when the outer block ends. `users` and `logs` are shorter sibling lifetimes inside it. So at first glance, the librarian can't help us -- she only knows how to keep books in a row, and we've got branches. But watch how a forest secretly *is* two lines.

We'll walk this lifetime forest with DFS, and then keep track of the pre-ordering and post-ordering by recording when we first enter a declaration's lifetime, and when we leave it. This gives us two different orderings of the books on the shelf that have a special property that our good friends Tarjan and Vishkin proved is exactly what we need. Here's our original example again, annotated by lifetime rather than syntax:

```C
{                              // enter root lifetime
    let prodDb: Database;      // enter prodDb lifetime
    {                          // enter users lifetime region
        let users: Table(prodDb);
    }                          // leave users lifetime region
    {                          // enter logs lifetime region
        let logs: Table(prodDb);
    }                          // leave logs lifetime region
}                              // leave prodDb, then root
```

The DFS hands us two shelves:

- **enter order:** `root`, `prodDb`, `users`, `logs`
- **leave order:** `users`, `logs`, `prodDb`, `root`

<img src="/assets/images/thoughtdumps/type-checker/dfs-enter-leave-orders.png" alt="Lifetime tree beside enter and leave order shelves showing the same nodes in their DFS orders." width="720">

Now the rule. `u` is available to `v` if and only if `u` is entered *before* `v` **and** left *after* `v`. The intuition is just containment: `u`'s lifetime opens before `v` and closes after it, so `v` lives entirely inside `u`'s lifetime. `prodDb` contains both `users` and `logs`, but `users` does not contain `logs`, so the legal and illegal references fall out of the same check. The nicest part is that we don't even need to re-compute the orderings at every insertion -- we can just maintain them as we go!

And that's the whole trick. This algorithm is fully implemented in the kernel of [mengine](https://github.com/triviajon/mengine), my Coq-like proof engine. The implementation can be found in the [kernel](https://github.com/triviajon/mengine/blob/main/src/kernel). 

We can now typecheck a whole program efficiently, and there are no other difficult things about writing a proof engine, right?

*Right?*
