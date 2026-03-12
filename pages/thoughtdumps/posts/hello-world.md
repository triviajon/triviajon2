---
title: hello world
date: 2026-03-12
tags: [meta]
description: another hello world
---

this is the first thoughtdump. if you're reading this, the blog works!

## some formatting

here's **bold**, *italic*, and a [link](https://github.com/triviajon). and a list:

- item one
- item two
- item three

## math

inline math: the quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$.

display math:

$$\int_0^\infty e^{-x^2} \, dx = \frac{\sqrt{\pi}}{2}$$

## code

```python
def greet(name):
    return f"hello, {name}!"
```

and here's some mengine:

```mengine
Definition id (x : Prop) : Prop := x.

Theorem id_refl : forall (A : Prop), A -> A.
Proof.
  intro A.
  intro H.
  exact H.
Admitted.
```

that's it for now.
