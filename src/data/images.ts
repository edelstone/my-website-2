const imageModules = import.meta.glob("../images/*.{png,jpg,jpeg,gif}", {
  eager: true,
  import: "default"
});

export const images = Object.fromEntries(
  Object.entries(imageModules).map(([filePath, image]) => {
    const match = filePath.match(/\/([^/]+)\.(png|jpe?g|gif)$/i);

    if (!match) {
      throw new Error(`Unexpected image path: ${filePath}`);
    }

    return [match[1], image];
  })
) as Record<string, ImageMetadata>;

export function getImageByName(name: string): ImageMetadata {
  const image = images[name];

  if (!image) {
    throw new Error(`Unknown image "${name}".`);
  }

  return image;
}
