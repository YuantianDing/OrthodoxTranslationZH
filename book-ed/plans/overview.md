
# `book-ed` - Book Editing TUI for `OrthodoxTranslationZH`

`book-ed` is a specialized terminal user interface (TUI) designed to facilitate the editing and management of book content for the `OrthodoxTranslationZH` project. This tool allows editors to create, modify, and organize book content in a structured manner, ensuring consistency and quality across translations. 

## Command-Line Interface (CLI)

`book-ed` provides a user-friendly command-line interface (CLI) that allows editors to perform various operations on book files. The CLI supports commands for loading, editing, validating, and saving book content in a structured format.

* `book-ed <options> <yaml-file>`: Open a book file in YAML format.
* `--new <yaml-file>`: Create a new book file with the specified name.
* `--lang <language-code>`: Specify the language code for the book (e.g., "ru" for Russian, "cn" for Chinese, "cn" as default).
* `--help`: Display help information about the available commands and options.
* `--version`: Display the version of the `book-ed` tool.

## Input formats

See [Book Schema for YAML files](./schema.md) for details on the input file format.

## User Interface

We structure the TUI using Flux architecture principles, ensuring a clear separation of concerns between the user interface, state management, and data handling. The main components of the TUI include:

* Store: Maintain the current state of the book being edited, including the content, cursor position, and any unsaved changes. See [Store Description](./ui/store.md) for details.
* Dispatcher: Listen for keyboard events and dispatch actions accordingly. See [Dispatcher Description](./ui/dispatcher.md) for details.
* Views: Render the book content in the terminal, allowing users to navigate and edit text blocks. See [Views Description](./ui/views.md) for details.
