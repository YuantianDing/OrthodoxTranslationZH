
# Book Schema for YAML files

The input files for `book-ed` are structured in YAML format to ensure readability and ease of editing. Below is the schema that defines the structure of these YAML files.

`MultilingualText` represents text that can be in multiple languages, stored as a mapping from country codes to their respective text. We represent each language using country codes as keys (e.g., "en" for English, "cn" for Chinese, "ru" for Russian).

```rs
#[derive(Serialize, Deserialize)]
pub struct MultilingualText(HashMap<String, String>);
```

`Book` represents a book entity with various attributes such as title, author, chapters, and publication details. Note that `footnotes` is a mapping from footnote identifiers (a string like `"[123]"`) to their respective multilingual text.

```rs
#[derive(Serialize, Deserialize)]
pub struct Book {
    title: MultilingualText,
    authors: Vec<MultilingualText>,
    languages: Vec<String>,
    document: Vec<Block>,
    footnotes: HashMap<String, MultilingualText>,
}
```

`Block` represents different types of content blocks within a book, such as paragraphs, headings, images, and lists. `type` indicates the kind of block, and `children` allows for nested structures, `initial` holds text that appears before the main text, 
e.g. "1.", "Question: ", and `label` can be used for additional metadata or identifiers.

```rs
#[derive(Serialize, Deserialize)]
pub struct Block {
    #[serde(rename = "type")]
    type_: String, // e.g., "paragraph", "heading1", "heading2", "heading3", "heading4"
    #[serde(skip_serializing_if = "Option::is_none")]
    initial: Option<MultilingualText>,
    text: MultilingualText,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    children: Vec<Block>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    label: Vec<String>,
}
```