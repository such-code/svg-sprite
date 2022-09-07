# About

This tool helps to generate sprite for svg-images. It can consume JSON configuration file with a list of svg images or
file list found by glob.

# Usage

## Using configuration file

Content of *config.json*:
```json
[
  "image-1.svg",
  "subdir/image-2.svg"
]
```

```shell
svg-sprite --config config.json --output sprite.svg --prefix "px-"
```

## Glob configuration

```shell
svg-sprite --source "./assets/**/*.svg" --output sprite.svg
```

# Known issues

- symbol id is generated from file name and could be repeated by another file with same name but in another directory;
- result should be properly formatted.