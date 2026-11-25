/* Instrument spec library. a/b = prism mm + ppm, ar/br = reflectorless mm + ppm, ang = angle accuracy (sec).
   Published figures come from manufacturer or distributor datasheets (checked Nov 2026). Index and 2C limits are
   NOT published: they are derived (index = angle accuracy, 2C = 4 x angle accuracy) and can be edited. */
(function (root) {
  const I = (id, brand, model, a, b, ar, br, ang, src, note) => ({ id, brand, model, a, b, ar, br, ang, idx: ang, c2: 4 * ang, src, note: note || '' });
  const LIST = [
    I('comnav-c200', 'ComNav', 'TS-C200', 2, 2, 3, 2, 2, 'ComNav / geo-matching.com'),
    I('comnav-c100', 'ComNav', 'TS-C100', 2, 2, 3, 2, 2, 'geo-matching.com (angle 2"); EDM assumed same class as C200', 'EDM figures not confirmed in the datasheet I found.'),
    I('foif-rts362n', 'FOIF (Android)', 'RTS362N', 2, 2, 3, 2, 2, 'geo-matching.com, FOIF', 'Listed as a 2" instrument; a 1" variant is also quoted by some sellers.'),
    I('foif-rts010n', 'FOIF (Android)', 'RTS010N', 1, 1, 3, 2, 1, 'geo-matching.com, FOIF'),
    I('south-nts500', 'South', 'NTS-500 series', 2, 2, 3, 2, 2, 'South NTS-500 manual', 'NTS-571R15 and similar.'),
    I('south-a1', 'South (Android)', 'A1', 2, 2, 3, 2, 2, 'South A1 datasheet (2" class)', 'Check the exact EDM figures on your model plate.'),
    I('stonex-r180', 'Stonex (Android)', 'R180 1"', 1, 1.5, 2, 2, 1, 'Stonex R180 datasheet', 'Values approximate; confirm against your datasheet.'),
    I('leica-ts07-2', 'Leica', 'FlexLine TS07 2"', 1, 1.5, 2, 2, 2, 'Leica FlexLine datasheet', 'Prism 1 mm + 1.5 ppm; R500 reflectorless taken as 2 mm + 2 ppm.'),
    I('leica-ts02', 'Leica', 'FlexLine TS02plus 5"', 1.5, 2, 3, 2, 5, 'Leica TS02plus datasheet', 'Reflectorless R500 taken as 3 mm + 2 ppm.'),
    I('trimble-s5-2', 'Trimble', 'S5 2"', 1, 2, 2, 2, 2, 'Trimble S5 product page'),
    I('trimble-c5-2', 'Trimble', 'C5 2"', 2, 2, 3, 2, 2, 'Trimble C5 product page'),
    I('topcon-os200-2', 'Topcon', 'OS-200 2"', 1.5, 2, 2, 2, 2, 'Topcon OS-200 datasheet'),
    I('sokkia-cx102', 'Sokkia', 'CX-102 2"', 2, 2, 3, 2, 2, 'Sokkia CX brochure', 'Reflectorless is 3 mm + 2 ppm to 200 m, then looser.'),
    I('nikon-nivo-2c', 'Nikon', 'Nivo 2.C', 2, 2, 3, 2, 2, 'Nikon Nivo catalogue')
  ];
  const api = { LIST, get: id => LIST.find(x => x.id === id) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SurveyInstruments = api;
})(typeof window !== 'undefined' ? window : globalThis);
