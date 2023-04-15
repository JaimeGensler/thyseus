# Contributing

Thank you for your interest in contributing to Thyseus! Please review this
document and the [code of conduct](./CODE_OF_CONDUCT.md) before submitting any
pull requests.

## Pull Requests

_**Please - ask first before starting any work.**_ As Thyseus is currently
pre-1.0 release, there are frequently commits & PRs with substantial diffs. If
you'd like to contribute, feel free to ping me or create an issue and I'll
respond as soon as I'm able to.

## General Guidelines

-   PRs that introduce potentially unsafe code (such as `eval` or eval-like
    constructs) will be rejected, _no matter how significant the performance
    gains may be_.
    -   Please consider contributing to
        [the transformer](https://www.github.com/JaimeGensler/thyseus) if your
        changes involve code generation/transformation.
-   PRs must be formatted using prettier - config is included in the project
    root.
-   PRs may use language features that require modern browsers **_only if_**
    those features are available in the three major browsers (Chrome, Safari,
    Firefox).
    -   If your PR requires langauge features with limited browser support,
        please feel free to open a discussion about it!
-   PRs must include tests for all new code.
