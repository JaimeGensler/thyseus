# Multithreading

Just as with any other Javascript, your code runs on a single thread by default
However, Thyseus is designed to allow you to take advantage of running your code
on multiple threads with a simple change of configuration. You don't need to
worry about scheduling, locks, creating and communicating between workers, or
how to share/propogate data - all of this is handled internally!

Thyseus also provides a number of **safety** guarantees. It takes advantage of
technologies offered by modern browsers to enable parallelism; **it does not and
will never use unsafe code**, such as stringifying functions, using `eval` or
eval-like constructs, or creating workers from blobs. You can rest assured that
your Thyseus projects are exactly as safe as the code you write, and changing
between single/multithreading does not make a difference!
