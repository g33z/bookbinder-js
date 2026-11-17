// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { expect, describe, it } from 'vitest';
import { schema, defaultConfig } from './configuration';

describe('configuration schema', () => {
  it('produces the default configuration from an empty object', () => {
    expect(defaultConfig).toEqual({
      printFile: 'both',
      pageRange: '',
      sourceRotation: 'none',
      rotatePage: false,
      paperSize: 'A4',
      paperSizeUnit: 'pt',
      printerType: 'duplex',
      paperRotation90: false,
      pageLayout: 'folio',
      cropMarks: false,
      cutMarks: false,
      pdfEdgeMarks: false,
      sigOrderMarks: false,
      pageScaling: 'lockratio',
      pagePositioning: 'centered',
      mainForeEdgePaddingPt: 0,
      bindingEdgePaddingPt: 0,
      topEdgePaddingPt: 0,
      bottomEdgePaddingPt: 0,
      sigFormat: 'standardsig',
      sigLength: 4,
      customSigLength: undefined,
      foreEdgePaddingPt: 0,
      wackySpacing: 'wacky_pack',
      flyleafs: 1,
      sewingMarksEnabled: false,
      sewingMarkLocation: 'all',
      sewingMarksMarginPt: 72,
      sewingMarksAmount: 3,
      sewingMarksTapeWidthPt: 36,
      paperSizeCustomWidth: 0,
      paperSizeCustomHeight: 0,
    });
    expect(defaultConfig.customSigLength).toBeUndefined();
  });

  it('drops unknown keys', () => {
    const actual = schema.parse({ fileDownload: 'x', somethingElse: 1 });
    expect(actual).not.toHaveProperty('fileDownload');
    expect(actual).not.toHaveProperty('somethingElse');
  });

  describe('string input (URL params / form values)', () => {
    it('accepts valid enum values', () => {
      const actual = schema.parse({
        pageLayout: 'octavo',
        sigFormat: 'customsig',
        paperSize: 'LETTER',
        sourceRotation: '90cw',
        printFile: 'aggregated',
        sewingMarkLocation: 'in_n_out',
      });
      expect(actual.pageLayout).toBe('octavo');
      expect(actual.sigFormat).toBe('customsig');
      expect(actual.paperSize).toBe('LETTER');
      expect(actual.sourceRotation).toBe('90cw');
      expect(actual.printFile).toBe('aggregated');
      expect(actual.sewingMarkLocation).toBe('in_n_out');
    });

    it('coerces numeric strings to numbers', () => {
      const actual = schema.parse({
        sigLength: '8',
        mainForeEdgePaddingPt: '12.5',
        flyleafs: '2',
        sewingMarksAmount: '5',
      });
      expect(actual.sigLength).toBe(8);
      expect(actual.mainForeEdgePaddingPt).toBe(12.5);
      expect(actual.flyleafs).toBe(2);
      expect(actual.sewingMarksAmount).toBe(5);
    });

    it('coerces empty numeric strings to 0', () => {
      const actual = schema.parse({ sigLength: '', flyleafs: '' });
      expect(actual.sigLength).toBe(0);
      expect(actual.flyleafs).toBe(0);
    });

    it('coerces boolean strings case-insensitively, including "on"', () => {
      const actual = schema.parse({
        rotatePage: 'TRUE',
        cropMarks: 'on',
        cutMarks: 'false',
        paperRotation90: 'true',
      });
      expect(actual.rotatePage).toBe(true);
      expect(actual.cropMarks).toBe(true);
      expect(actual.cutMarks).toBe(false);
      expect(actual.paperRotation90).toBe(true);
    });

    it('trims the page range', () => {
      expect(schema.parse({ pageRange: '  1-3 ' }).pageRange).toBe('1-3');
    });

    it('splits a comma separated custom signature list', () => {
      expect(schema.parse({ customSigLength: '1, 2,3' }).customSigLength).toEqual([1, 2, 3]);
      expect(schema.parse({ customSigLength: '' }).customSigLength).toEqual([0]);
    });
  });

  describe('native input (local storage / round trip)', () => {
    it('accepts booleans and number arrays', () => {
      const actual = schema.parse({ rotatePage: true, cutMarks: false, customSigLength: [3, 4] });
      expect(actual.rotatePage).toBe(true);
      expect(actual.cutMarks).toBe(false);
      expect(actual.customSigLength).toEqual([3, 4]);
    });

    it('round-trips a parsed configuration unchanged', () => {
      const configuration = schema.parse({
        pageLayout: 'quarto',
        sigLength: '6',
        customSigLength: '2,4',
        rotatePage: 'on',
        pageRange: '5-10',
      });
      expect(schema.parse(configuration)).toEqual(configuration);
    });
  });

  // Invalid or missing values fall back to the field's default, so a bad URL
  // parameter can never leave the configuration in an unusable state.
  describe('invalid input', () => {
    it('falls back to defaults for invalid values', () => {
      const actual = schema.parse({
        pageLayout: 'xx',
        sigFormat: 'xx',
        paperSize: 'Z9',
        sigLength: 'abc',
        customSigLength: 'a,b',
        rotatePage: 'maybe',
      });
      expect(actual.pageLayout).toBe('folio');
      expect(actual.sigFormat).toBe('standardsig');
      expect(actual.paperSize).toBe('A4');
      expect(actual.sigLength).toBe(4);
      expect(actual.customSigLength).toBeUndefined();
      expect(actual.rotatePage).toBe(false);
    });

    it('falls back to defaults for null (missing form fields), except numbers become 0', () => {
      const actual = schema.parse({
        pageLayout: null,
        customSigLength: null,
        rotatePage: null,
        pageRange: null,
        sigLength: null,
      });
      expect(actual.pageLayout).toBe('folio');
      expect(actual.customSigLength).toBeUndefined();
      expect(actual.rotatePage).toBe(false);
      expect(actual.pageRange).toBe('');
      expect(actual.sigLength).toBe(0);
    });

    it('never throws', () => {
      expect(() =>
        schema.parse({ pageLayout: 42, rotatePage: {}, customSigLength: [{}], sigLength: [] })
      ).not.toThrow();
    });
  });
});
