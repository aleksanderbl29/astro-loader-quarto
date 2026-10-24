# Metadata mapping reference

| Quarto field    | Astro field   |
| --------------- | ------------- |
| `date`          | `pubDate`     |
| `date-modified` | `updatedDate` |
| `last-modified` | `updatedDate` |
| `image`         | `heroImage`   |

All other fields retain their names and values until the caller's schema parses
them. Date strings in the date aliases and their native Astro names become
`Date` values. Invalid date strings fail. Arrays, objects, booleans, and custom
fields remain intact. The loader does not coerce authors or tags into strings.

Aliases are exclusive. A document containing both `date` and `pubDate`, both
`date-modified` and `last-modified`, or both `image` and `heroImage` fails even
when their values match. This includes conflicting fields inherited under
different names. Keep one spelling or override `fieldMappings` explicitly.

Metadata precedence, from lowest to highest, is listing defaults, project root
metadata, ancestor `_metadata.yml` or `_metadata.yaml`, and document frontmatter.
Values override the same key as a whole; arrays and objects are not deep-merged.
Define schema defaults in `defineCollection({ schema })`, for example
`draft: z.boolean().default(false)`. Astro schema stripping remains the caller's
choice. Use `.passthrough()` to preserve fields outside the declared shape.

An explicit frontmatter `slug` determines the entry ID before schema parsing.
It does not depend on the schema preserving `slug` as a data property.
