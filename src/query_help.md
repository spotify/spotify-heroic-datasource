###### Custom Filter Legend
| | | | | |
|----------|:-------------:|-|----------|:-------------:|
| Simple string without quotes | `hello1234` | | Simple string with quotes |    `"hello world $"` |
| tag `foo` _equals to_ `bar` | `foo = bar` | | tag `foo` _does not equal to_ `bar` | `foo != bar` |
|  key _equals to_ `bar` | `$key = bar`  | | key _does not equal to_ `bar` |  `$key != bar` |
| tag `foo` _equals to either_ `bar`, or `baz` | `foo in [bar, baz]` | | tag `foo` _does not equal to either_ `bar`, or `baz` |  `foo not in [bar, baz]` |
|  tag `foo` _exists_ | `+foo`  | | tag `foo` _does not exist_ |  `!+foo` |
|  tag `foo` _is_ prefixed with `bar` | `foo ^ bar`  | | tag `foo` _is not_ prefixed with `bar` |  `foo !^ bar` |
| Expression `<a>` and `<b>`, must be true  |  `<a> and <b>` | | Any expression `<a>` or `<b>`, must be true | `<a> or <b>` |
|  Invert |  `! (<a> and <b>)` | | Override grouping |  `(<a> or <b>) and <c>` |
