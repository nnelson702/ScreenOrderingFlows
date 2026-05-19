// vendor-pagination.js
// Deterministic grouping/chunking rules for vendor order form generation.
// This file is intentionally pure logic so the vendor form renderer can consume stable page packets.

const VENDOR_LINES_PER_PAGE = 10;

function cleanVendorValue(value, fallback = '') {
  return String(value == null || value === '' ? fallback : value).trim();
}

function lowerVendorValue(value, fallback = '') {
  return cleanVendorValue(value, fallback).toLowerCase();
}

function normalizeVendorItem(item, index = 0) {
  const type = lowerVendorValue(item.type || item.screenType, 'window') === 'door' ? 'door' : 'window';
  return {
    ...item,
    _vendorOriginalIndex: Number.isFinite(Number(item.sort_index)) ? Number(item.sort_index) : index + 1,
    _vendorType: type,
    _vendorQty: Number(item.qty || 1),
    _vendorFrameType: cleanVendorValue(item.frame_type || item.frameType),
    _vendorFrameColor: cleanVendorValue(item.frame_color || item.frameColor),
    _vendorMaterialType: cleanVendorValue(item.material_type || item.materialType),
    _vendorMaterialColor: cleanVendorValue(item.material_color || item.materialColor),
    _vendorFrameCutType: cleanVendorValue(item.frame_cut_type || item.frameCutType, 'standard'),
    _vendorSpreaderbarSize: cleanVendorValue(item.crossbar_type || item.crossbarType, item.crossbar_needed || item.crossbarNeeded ? 'unspecified' : 'none'),
    _vendorRollerType: cleanVendorValue(item.roller_type || item.doorRollers, 'steel_rollers'),
    _vendorHandleOrientation: cleanVendorValue(item.handle_orientation || item.handleOrientation, 'unspecified')
  };
}

function getWindowVendorGroupKey(item) {
  return [
    'window',
    lowerVendorValue(item._vendorMaterialType),
    lowerVendorValue(item._vendorMaterialColor),
    lowerVendorValue(item._vendorFrameType),
    lowerVendorValue(item._vendorFrameColor),
    lowerVendorValue(item._vendorFrameCutType, 'standard'),
    lowerVendorValue(item._vendorSpreaderbarSize, 'none')
  ].join('|');
}

function getDoorVendorGroupKey(item) {
  return [
    'door',
    lowerVendorValue(item._vendorFrameType),
    lowerVendorValue(item._vendorFrameColor),
    lowerVendorValue(item._vendorMaterialType),
    lowerVendorValue(item._vendorMaterialColor),
    lowerVendorValue(item._vendorRollerType, 'steel_rollers'),
    lowerVendorValue(item._vendorHandleOrientation, 'unspecified')
  ].join('|');
}

function getVendorGroupKey(item) {
  return item._vendorType === 'door' ? getDoorVendorGroupKey(item) : getWindowVendorGroupKey(item);
}

function getVendorGroupSelections(item) {
  if (item._vendorType === 'door') {
    return {
      type: 'door',
      frame_type: item._vendorFrameType,
      frame_color: item._vendorFrameColor,
      material_type: item._vendorMaterialType,
      material_color: item._vendorMaterialColor,
      roller_type: item._vendorRollerType || 'steel_rollers',
      handle_orientation: item._vendorHandleOrientation
    };
  }

  return {
    type: 'window',
    material_type: item._vendorMaterialType,
    material_color: item._vendorMaterialColor,
    frame_type: item._vendorFrameType,
    frame_color: item._vendorFrameColor,
    frame_cut_type: item._vendorFrameCutType || 'standard',
    spreaderbar_size: item._vendorSpreaderbarSize || 'none'
  };
}

function compareVendorItems(a, b) {
  const left = [
    a._vendorType,
    a._vendorMaterialType,
    a._vendorMaterialColor,
    a._vendorFrameType,
    a._vendorFrameColor,
    a._vendorFrameCutType,
    a._vendorSpreaderbarSize,
    a._vendorRollerType,
    a._vendorHandleOrientation,
    String(a._vendorOriginalIndex).padStart(5, '0')
  ].map((v) => lowerVendorValue(v));

  const right = [
    b._vendorType,
    b._vendorMaterialType,
    b._vendorMaterialColor,
    b._vendorFrameType,
    b._vendorFrameColor,
    b._vendorFrameCutType,
    b._vendorSpreaderbarSize,
    b._vendorRollerType,
    b._vendorHandleOrientation,
    String(b._vendorOriginalIndex).padStart(5, '0')
  ].map((v) => lowerVendorValue(v));

  return left.join('|').localeCompare(right.join('|'));
}

function chunkVendorItems(items, chunkSize = VENDOR_LINES_PER_PAGE) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function buildVendorPages(rawItems, options = {}) {
  const linesPerPage = Number(options.linesPerPage || VENDOR_LINES_PER_PAGE);
  const normalized = (rawItems || []).map(normalizeVendorItem).sort(compareVendorItems);
  const groups = new Map();

  normalized.forEach((item) => {
    const key = getVendorGroupKey(item);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        pageType: item._vendorType,
        selections: getVendorGroupSelections(item),
        items: []
      });
    }
    groups.get(key).items.push(item);
  });

  const windowPages = [];
  const doorPages = [];

  Array.from(groups.values()).forEach((group) => {
    chunkVendorItems(group.items, linesPerPage).forEach((chunk, chunkIndex) => {
      const page = {
        pageType: group.pageType,
        groupKey: group.key,
        groupSelections: group.selections,
        groupChunkIndex: chunkIndex + 1,
        lineCapacity: linesPerPage,
        lines: chunk,
        blankLineCount: Math.max(0, linesPerPage - chunk.length)
      };
      if (group.pageType === 'door') doorPages.push(page);
      else windowPages.push(page);
    });
  });

  const allPages = [...windowPages, ...doorPages].map((page, index, pages) => ({
    ...page,
    pageNumber: index + 1,
    pageCount: pages.length,
    typePageNumber: null,
    typePageCount: null
  }));

  function numberByType(type) {
    const typed = allPages.filter((page) => page.pageType === type);
    typed.forEach((page, index) => {
      page.typePageNumber = index + 1;
      page.typePageCount = typed.length;
    });
  }

  numberByType('window');
  numberByType('door');

  return { windowPages, doorPages, allPages };
}

if (typeof window !== 'undefined') {
  window.ScreenVendorPagination = {
    VENDOR_LINES_PER_PAGE,
    buildVendorPages,
    normalizeVendorItem,
    getVendorGroupKey,
    getWindowVendorGroupKey,
    getDoorVendorGroupKey
  };
}
