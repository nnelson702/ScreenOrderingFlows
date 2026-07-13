// line-item-editor.js
// Enables editing draft screen line items before quote submission only.
(function () {
  let installed = false;
  let editIndex = null;

  function byIdLocal(id) {
    return document.getElementById(id);
  }

  function isEditing() {
    return editIndex !== null && editIndex !== undefined;
  }

  function cloneHardware(assignments) {
    return (assignments || []).map((assignment) => ({
      typeId: assignment.typeId || assignment.type_id || assignment.hardware_type || '',
      initials: assignment.initials || assignment.hardware_initials || '?',
      label: assignment.label || assignment.hardware_label || assignment.typeId || assignment.hardware_type || '',
      side: assignment.side || assignment.location || 'top',
      qty: Math.max(1, parseInt(assignment.qty || assignment.quantity || 1, 10) || 1)
    }));
  }

  function injectStyles() {
    if (byIdLocal('lineItemEditorStyles')) return;
    const style = document.createElement('style');
    style.id = 'lineItemEditorStyles';
    style.textContent = `
      .lineitem-actions{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;justify-content:flex-start}
      .lineitem-actions .btn{white-space:nowrap}
      .line-item-edit-notice{border:1px solid #f3d28d;background:#fff4dc;color:#805000;border-radius:12px;padding:10px 12px;margin:0 0 14px;line-height:1.4}
      .line-item-edit-notice.hidden{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function ensureEditNotice() {
    let notice = byIdLocal('lineItemEditNotice');
    if (notice) return notice;

    const form = byIdLocal('screenForm');
    const card = document.querySelector('#view-add-screen .card');
    if (!form || !card) return null;

    notice = document.createElement('div');
    notice.id = 'lineItemEditNotice';
    notice.className = 'line-item-edit-notice hidden';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    card.insertBefore(notice, form);
    return notice;
  }

  function setScreenFormMode() {
    const title = document.querySelector('#view-add-screen .section-header h2');
    const subtitle = document.querySelector('#view-add-screen .section-header .view-subtitle');
    const save = byIdLocal('btnSaveScreen');
    const cancel = byIdLocal('btnCancelScreen');
    const notice = ensureEditNotice();

    if (isEditing()) {
      const number = editIndex + 1;
      if (title) title.textContent = `Edit Screen #${number}`;
      if (subtitle) subtitle.textContent = 'Update this draft screen before submitting the quote.';
      if (save) save.textContent = 'Update Screen';
      if (cancel) cancel.textContent = 'Cancel Edit';
      if (notice) {
        notice.textContent = `Editing Screen #${number}. Save changes to update this screen, or cancel editing to keep the original.`;
        notice.classList.remove('hidden');
      }
    } else {
      if (title) title.textContent = 'Add Screen';
      if (subtitle) subtitle.textContent = "We'll walk through this opening one step at a time. You can add as many screens as you need.";
      if (save) save.textContent = 'Save Screen';
      if (cancel) cancel.textContent = 'Cancel';
      if (notice) notice.classList.add('hidden');
    }
  }

  function clearEditMode() {
    editIndex = null;
    setScreenFormMode();
  }

  function setSelectValue(select, value) {
    if (!select) return;
    const stringValue = String(value == null ? '' : value);
    const optionExists = Array.from(select.options || []).some((option) => option.value === stringValue);
    if (optionExists) select.value = stringValue;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setRadioValue(form, name, value) {
    const radio = form.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function populateScreenFormFromItem(item) {
    const form = byIdLocal('screenForm');
    if (!form || !item) return;

    const type = item.screenType === 'door' ? 'door' : 'window';
    setRadioValue(form, 'screenType', type);
    if (typeof handleScreenTypeChange === 'function') handleScreenTypeChange();

    form.screenQty.value = item.qty || 1;
    form.screenWidthWhole.value = item.widthWhole || '';
    form.screenWidthFraction.value = item.widthFraction || '';
    form.screenHeightWhole.value = item.heightWhole || '';
    form.screenHeightFraction.value = item.heightFraction || '';

    setSelectValue(form.frameType, item.frameType || '');
    if (typeof updateFrameColorOptions === 'function') updateFrameColorOptions();
    setSelectValue(form.frameColor, item.frameColor || '');
    if (typeof renderFrameColorTiles === 'function') renderFrameColorTiles();
    if (typeof syncFrameColorSwatch === 'function') syncFrameColorSwatch();

    setSelectValue(form.materialType, item.materialType || '');
    if (typeof updateMaterialColorOptions === 'function') updateMaterialColorOptions();
    setSelectValue(form.materialColor, item.materialColor || '');
    if (typeof renderMaterialColorTiles === 'function') renderMaterialColorTiles();
    if (typeof syncMaterialColorSwatch === 'function') syncMaterialColorSwatch();

    if (type === 'window') {
      setRadioValue(form, 'frameCutType', item.frameCutType || 'standard');
      form.crossbarNeeded.value = item.crossbarNeeded ? 'yes' : 'no';
      if (typeof handleCrossbarChange === 'function') handleCrossbarChange();
      if (form.crossbarType && item.crossbarType) form.crossbarType.value = item.crossbarType;
      if (form.crossbarOrientation && item.crossbarOrientation) form.crossbarOrientation.value = item.crossbarOrientation;
      if (form.crossbarDistance) form.crossbarDistance.value = item.crossbarDistance || '';

      if (typeof currentHardwareAssignments !== 'undefined') {
        currentHardwareAssignments = cloneHardware(item.hardwareAssignments || []);
      }
      if (typeof renderHardwareDiagram === 'function') renderHardwareDiagram();
      if (typeof updateHardwareSummary === 'function') updateHardwareSummary();
      if (typeof updateHardwareImage === 'function') updateHardwareImage();
    } else {
      if (form.doorRollers && item.doorRollers) form.doorRollers.value = item.doorRollers;
      if (form.handleOrientation && item.handleOrientation) form.handleOrientation.value = item.handleOrientation;
      if (form.handleHeightWhole) form.handleHeightWhole.value = item.handleHeightWhole || '';
      if (form.handleHeightFraction) form.handleHeightFraction.value = item.handleHeightFraction || '';
    }

    if (typeof showScreenStep === 'function') showScreenStep(1);
    setScreenFormMode();
  }

  function buildDraftItemFromForm(form, previousItem) {
    const type = getCurrentScreenType();
    const qty = Math.max(1, parseInt(form.screenQty.value, 10) || 1);

    const widthWhole = form.screenWidthWhole.value;
    const widthFraction = form.screenWidthFraction.value;
    const heightWhole = form.screenHeightWhole.value;
    const heightFraction = form.screenHeightFraction.value;

    const widthDisplay = formatDimensionDisplay(widthWhole, widthFraction);
    const heightDisplay = formatDimensionDisplay(heightWhole, heightFraction);
    const widthInches = parseDimensionInches(widthWhole, widthFraction);
    const heightInches = parseDimensionInches(heightWhole, heightFraction);

    if (widthInches <= 0 || heightInches <= 0) {
      alert('Please enter valid width and height measurements.');
      return null;
    }

    const frameType = form.frameType.value;
    const frameColor = form.frameColor.value;
    const materialType = form.materialType.value;
    const materialColor = form.materialColor.value;

    const frames = getFrameOptionsForScreenType(type);
    const frameDef = frames.find((frame) => frame.id === frameType);
    const frameKey = type === 'door' && frameDef?.pricingKey ? frameDef.pricingKey : frameType;
    const ratePerInch = getRetailRatePerInch(materialType, frameKey, type);

    let unitPrice = null;
    let lineTotal = null;
    if (ratePerInch != null) {
      const pricedHalfPerimeter = Math.ceil(widthInches + heightInches);
      unitPrice = roundCurrency(pricedHalfPerimeter * ratePerInch);
      lineTotal = roundCurrency(unitPrice * qty);
    } else if (typeof logError === 'function') {
      logError({
        errorType: 'PRICING_LOOKUP_MISS',
        location: 'line-item-editor buildDraftItemFromForm',
        rawPayload: { materialType, frameKey, screenType: type }
      });
    }

    if (type === 'window' && typeof crossbarRecommended !== 'undefined' && crossbarRecommended && form.crossbarNeeded.value === 'no') {
      alert('This opening is large enough that we recommend a crossbar. You chose not to include one. Be aware this may cause some bowing in the middle.');
    }

    const baseItem = {
      id: previousItem?.id || editIndex + 1,
      screenType: type,
      qty,
      width: widthDisplay,
      height: heightDisplay,
      widthWhole,
      widthFraction,
      heightWhole,
      heightFraction,
      widthInches,
      heightInches,
      frameType,
      framePricingKey: frameKey,
      frameColor,
      materialType,
      materialColor,
      unitPrice,
      lineTotal
    };

    if (type === 'window') {
      baseItem.frameCutType = form.frameCutType.value;
      baseItem.crossbarNeeded = form.crossbarNeeded.value === 'yes';
      if (baseItem.crossbarNeeded) {
        baseItem.crossbarType = form.crossbarType.value.trim();
        baseItem.crossbarOrientation = form.crossbarOrientation.value;
        baseItem.crossbarDistance = form.crossbarDistance.value.trim();
      }
      baseItem.hardwareAssignments = typeof currentHardwareAssignments !== 'undefined' ? currentHardwareAssignments.slice() : [];
    } else {
      baseItem.doorRollers = form.doorRollers.value;
      baseItem.handleOrientation = form.handleOrientation.value;
      const hhWhole = form.handleHeightWhole.value;
      const hhFraction = form.handleHeightFraction.value;
      baseItem.handleHeightWhole = hhWhole;
      baseItem.handleHeightFraction = hhFraction;
      baseItem.handleHeightDisplay = formatDimensionDisplay(hhWhole, hhFraction);
      baseItem.handleHeightInches = parseDimensionInches(hhWhole, hhFraction);
    }

    return baseItem;
  }

  function handleScreenSubmitWithEdit(event) {
    if (!isEditing()) return handleScreenSubmit(event);

    event.preventDefault();
    const previousItem = AppState.lineItems[editIndex];
    if (!previousItem) {
      clearEditMode();
      return handleScreenSubmit(event);
    }

    const updatedItem = buildDraftItemFromForm(event.target, previousItem);
    if (!updatedItem) return;

    AppState.lineItems[editIndex] = updatedItem;
    if (typeof resetHardwareAssignments === 'function') resetHardwareAssignments();
    const updatedNumber = editIndex + 1;
    clearEditMode();
    renderLineItems();
    renderSummary();
    showView('dashboard');
    if (typeof showBanner === 'function') showBanner(`Screen #${updatedNumber} updated.`, 'success');
  }

  function beginLineItemEdit(index) {
    if (!Array.isArray(AppState.lineItems)) return;
    const item = AppState.lineItems[index];
    if (!item) return;

    editIndex = index;
    if (typeof resetScreenForm === 'function') resetScreenForm();
    populateScreenFormFromItem(item);
    showView('add-screen');
  }

  function enhancedRenderLineItems() {
    const tbody = byIdLocal('lineItemsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    AppState.lineItems.forEach((item, index) => {
      const tr = document.createElement('tr');
      const hwSummary = item.screenType === 'window' ? summarizeHardware(item.hardwareAssignments || []) : summarizeDoorHardware(item.doorRollers);
      const linePrice = item.lineTotal != null ? `$${item.lineTotal.toFixed(2)}` : '—';

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.screenType === 'door' ? 'Patio Door' : 'Window'}</td>
        <td>${item.qty}</td>
        <td>${escapeHtml(item.width)}</td>
        <td>${escapeHtml(item.height)}</td>
        <td>${escapeHtml(formatFrameSummary(item))}</td>
        <td>${escapeHtml(formatMaterialSummary(item))}</td>
        <td class="crossbar-handle-cell">${escapeHtml(compactCrossbarHandle(item))}</td>
        <td>${escapeHtml(hwSummary)}</td>
        <td>${linePrice}</td>
        <td><div class="lineitem-actions"><button type="button" class="btn btn-secondary btn-xs" data-action="edit" data-index="${index}">Edit</button><button type="button" class="btn btn-secondary btn-xs" data-action="remove" data-index="${index}">Remove</button></div></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('button[data-action][data-index]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        if (Number.isNaN(idx)) return;

        if (btn.getAttribute('data-action') === 'edit') {
          beginLineItemEdit(idx);
          return;
        }

        if (btn.getAttribute('data-action') === 'remove') {
          AppState.lineItems.splice(idx, 1);
          if (isEditing()) {
            if (editIndex === idx) clearEditMode();
            else if (editIndex > idx) editIndex -= 1;
          }
          renderLineItems();
          renderSummary();
        }
      });
    });
  }

  function bindControls() {
    const form = byIdLocal('screenForm');
    if (form && typeof handleScreenSubmit === 'function') {
      form.removeEventListener('submit', handleScreenSubmit);
      form.addEventListener('submit', handleScreenSubmitWithEdit);
    }

    byIdLocal('btnAddScreen')?.addEventListener('click', () => {
      clearEditMode();
    }, true);

    byIdLocal('btnCancelScreen')?.addEventListener('click', () => {
      if (isEditing() && typeof resetScreenForm === 'function') resetScreenForm();
      clearEditMode();
    }, true);
  }

  function install() {
    if (installed) return;
    installed = true;
    injectStyles();
    ensureEditNotice();
    if (typeof renderLineItems === 'function') {
      renderLineItems = enhancedRenderLineItems;
    }
    bindControls();
    setScreenFormMode();
    renderLineItems();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
