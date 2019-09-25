Who is what

A variable (const or var) has a name and a type
struct, enum, union have type `type`
scopes have no type but have member
error has type `error`


I want to
 - list all symbols in a file
 - list all symbols in a workspace (that comes later)
 - lookup the location of the *real* definition of a symbol

** Completions **
 - list all the symbols available in a given scope
 - list all the **members** available in a given value (using '.')

** FnDefs **
 - display the function prototype hovering when entering (

 - display information when hovering over a symbol


Scopes are the entry point to the completion ; a scope contains declarations.
They're the ones that allow us to look up symbols.
Once symbols are looked up, we look through them to perform magic.

Anything beginning by const | var | fn is a symbol. A symbol can be looked up.
I have to handle symbols ;
- variable (const / var)
- error
-