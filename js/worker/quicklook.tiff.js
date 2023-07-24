if (self.data.memory) {
  Tiff.initialize({ TOTAL_MEMORY: self.data.memory });
}

var tiff = new Tiff({ buffer: self.data.data });
self.res = {
  image: tiff.readRGBAImage(),
  width: tiff.width(),
  height: tiff.height()
};
