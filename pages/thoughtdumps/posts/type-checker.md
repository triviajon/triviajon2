---
title: so, you're building a type checker
date: 2026-05-31
tags: []
description: an overview of a cool data structure i implemented for mengine
---

Say you're writing a compiler, or interpreter, or *anything* that needs to type check code. How do you know that it's legal to declare a variable in a certain scope?

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
        let logs : Table(prodDb);
        // maybe you want to do some operations on logs...
    }
}
```

How do you know that you can actually declare `users` and `logs` in their respective scopes? How do we know that we can't make a reference to `users` in the scope of `logs`?

<!-- ILLUSTRATION: nested scope diagram — boxes inside boxes, showing prodDb in the outer scope, users and logs in their own inner boxes, with an X through an arrow trying to reach users from the logs box -->

It feels fairly obvious to us, but how would you actually implement this? Moreover, typecheckers need to do these sorts of checks thousands to millions of times per program, so how do we make this efficient?

# solution 0: everyone's favorite? 

Brute force! Here's how we apply it here:
- if we're defining the variable `users: Table(prodDb)`, we just need to check that the type `Table(prodDb)` is well defined in the scope that it's defined in. 
- how do we know that `Table(prodDb)` is well defined? We need to check that the type constructor `Table` is well defined in the scope that it's defined in, and that its arguments (just `prodDb` in this case) are well defined in the scope that it's defined in.
- finally, if we "climb" scopes, we can see that previously, `prodDb` was defined beforehand, and `Table` was defined as well.

<!-- ILLUSTRATION: the "climbing scopes" check — a small tree with users at a leaf, an arrow climbing up through its parent scopes, with checkmarks as it finds Table and prodDb along the way -->

Ugh, how many times did I type "defined"? And we do this dance every single time we define a new variable, constructor, or type. There has to be a better way.

# the Boston Public Library

The other day, I received an invitation to two of my friends' weddings. I'm really excited for them! They're getting married at the Boston Public Library, and I'm really looking forward to it. The only problem is that I don't have a date yet -- *ladies*.

But anyway, imagine you're standing in a library - not a small one, but a vast cathedral of books, with shelves stretching out in every direction imaginable. You're approached by the blind librarian, who has a very peculiar request.
 
"see this shelf?" she gestures at an enormous, empty shelf running the length of the room.

"...yeah?"


"well. I can't. I'm blind. I need you to fill it with books for me."

"...okay?"

"the books will arrive one at a time. When a book arrives, I'll tell you where to place it relative to a book that's already on the shelf -- to the right of this one, to the left of that one. You figure out exactly where it goes."

You nod slowly.

"sometimes a book will be removed. When that happens, take it off the shelf. You can burn it, or set it aside in a pile. I don't care."

"and?"

"and at any moment, I might ask you about two books: which one comes first?"

You stare at the shelf. It stretches into the distance, much longer than you could ever need. *why is it so big?*, you wonder. She hasn't told you how many books are coming. Maybe ten, maybe ten million. But the shelf -- the shelf has room for all of them, and then some.

You don't know it yet, but that's going to matter.

<!-- ILLUSTRATION: a cute wide shelf stretching off the page into the distance, a few books scattered on it with huge empty gaps between them, a little figure standing at one end looking overwhelmed -->

You nod slowly.

# order-maintenance problem

So, why the detour? It turns out the librarian's shelf and our type checker are secretly the same problem. Stick with the shelf analogy for a second.

Every book on that shelf has a place: given any two of them, one sits to the left of the other. That defines a *total order*, and keeping one alive while books come and go is exactly the **order-maintenance problem**. Formally, it asks us to maintain a totally ordered set (for every `x != y`, either `x < y` or `y < x`) supporting three operations:

- `insert(X, Y)`, which inserts X immediately after Y in the total order;
- `order(X, Y)`, which determines if X precedes Y in the total order; and
- `delete(X)`, which removes X from the set.

Now, how could we actually implement this? 

The simplest solution is to use a linked list: insertion is just finding `X` in the list and inserting it after it, deletion is just finding `X` in the list and removing it, and order is just comparing the positions of `X` and `Y`. Boom, O(n) time complexity for each operation if we have to find `X` first. Even if we cheat and assume we're handed a direct pointer to `X`'s node (so insert and delete drop to O(1)), `order` is still O(n) -- we have to walk the list to know who comes first. Can we do better?

<!-- ILLUSTRATION: a linked list with nodes A → B → C → D → E, with a little walker figure hopping node-by-node between two highlighted nodes, looking tired -->

Well, yes! In 1988, Dietz and Sleator gave a solution to this problem. Then in 2002, Bender et al. gave the world an *elegant* one called the *tag-range relabeling algorithm*.

The whole reason `order` was slow is that we had to walk the list to find where `X` and `Y` sit. So what if we just remembered? Bender et al. suggests that instead of storing elements in a linked list and walking it, we **assign a number to each element**. These numbers -- let's call them *tags* -- are just `uint64_t`s that encode position: if `X.tag < Y.tag`, then `X` comes before `Y`. 

So how do we hand out these tags?

Remember the librarian's shelf? It was *enormous*. Far bigger than she could ever need. That wasn't a throwaway detail. The shelf is so big because we're going to map it onto the range of a `uint64_t`, which gives us $2^{64}$ slots to work with. When the very first book arrives, we plop it down somewhere in the middle of that range. When the second book arrives -- say, immediately after the first -- we give it a tag halfway between the first book's tag and the end of the range. When the third book arrives between them, we give it a tag halfway between *those* two. And so on.

<!-- ILLUSTRATION: a number line from 0 to 2^64, with a few books placed at widely spaced tag values; a new book arriving gets the midpoint between two of them highlighted with an arrow -->

Most of the time, this ends up working beautifully. You have a gap, you take the midpoint, you're done. O(1). 

But friends, nothing lasts forever. Eventually, you're going to *locally* run out of room. Some unlucky region of the shelf will have books packed tightly enough that there's no room between them. The gap is `0`, and you can't fit a new tag in there. *Now* what?

<!-- ILLUSTRATION: a zoomed-in section of the same number line, now with books crammed shoulder-to-shoulder, a new book trying to squeeze in with a sad face, no room -->

# remember ~~the alamo~~ amortized analysis?

We **relabel** to reach into that crowded region and spread the books out, redistributing their tags to make room. The cleverness is in *how much* of the shelf you relabel.

If every insertion triggered a global relabel of the entire shelf, we'd be doing O(n) work per insertion, and we'd be no better off than the linked list. So the algorithm picks a small window around the crowded spot, just big enough to be "sparse enough" to redistribute cleanly. It scans outward in exponentially growing ranges -- first 2 books, then 4, then 8, then 16, and at each scale, it checks: *is the density of this window below some threshold?* the threshold is carefully tuned so that whenever you find a window that passes the test, you can relabel just that window and your future self is guaranteed to have enough breathing room for a while.

The magic is in the amortized analysis. Any single insertion might trigger a relabel that touches O(log n) tags, but across many insertions, the cost can work out to O(log n) per insertion. Checking `order(X, Y)` becomes essentially free -- just compare two integers. Deletion, like `delete(X)`, on the other hand implies some way of "remembering" that `X`'s tag can be reused for a new element. By overlaying a linked list on top of the elements telling us the "neighboring" elements, in terms of tags, this gives us O(1) time for deletion as well.

<!-- ILLUSTRATION: a zoomed-in section of the number line showing a book having pointers to its neighboring books -->

So we have:

| operation | linked list | tag-range relabeling  |
|-----------|-------------|-----------------------|
| insert    | O(n)        | O(log n) amortized    |
| delete    | O(n)        | O(1)                  |
| order     | O(n)        | **O(1)**              |

Every operation got better or stayed the same — and `order`, the one we're going to call millions of times, went from O(n) to essentially free.

# back to the type checker

Now let's collect what we have. We've solved the librarian's problem: we can maintain a totally ordered sequence with cheap inserts, deletes, and order queries. But our type checker isn't asking about a totally ordered sequence -- it's asking about ancestry in a forest. How do we get from one to the other?

Order-maintenance lives on a line. Scopes are a tree. So at first glance, the librarian can't help us -- she only knows how to keep books in a row, and we've got branches. But watch how a tree secretly *is* two lines.

We'll walk the scope tree with DFS, and then keep track of the pre-ordering and post-ordering by recording when we first enter a node, and when we leave it. This gives us two different orderings of the books on the shelf that have a special property that our good friends Tarjan and Vishkin proved is exactly what we need. Here's our original example again:

```C
{                              // enter root
    let prodDb: Database;      // enter prodDb
    {                          // enter usersScope
        let users: Table(prodDb);
    }                          // leave usersScope
    {                          // enter logsScope
        let logs : Table(prodDb);
    }                          // leave logsScope
}                              // leave root
```

The DFS hands us two shelves:

- **enter order:** `root`, `prodDb`, `usersScope`, `logsScope`
- **leave order:** `prodDb`, `usersScope`, `logsScope`, `root`

<!-- ILLUSTRATION: the scope tree on the left, two horizontal shelves on the right labeled "enter" and "leave", with the same nodes placed in their respective DFS orders -->

Now the rule. `u` is an ancestor of `v` if and only if `u` is entered *before* `v` **and** left *after* `v`. The intuition is just containment: an ancestor opens before its descendant and closes after it -- the descendant lives entirely "inside" the ancestor's lifetime. The nicest part is that we don't even need to re-compute the orderings at every insertion -- we can just maintain them as we go!

And that's the whole trick. This algorithm is fully implemented in the kernel of [mengine](https://github.com/triviajon/mengine), my Coq-like proof engine. The implementation can be found in the [kernel](https://github.com/triviajon/mengine/blob/main/src/kernel). 

We can now typecheck a whole program efficiently, and there's no other difficult things about writing a proof engine, right?

*Right?*