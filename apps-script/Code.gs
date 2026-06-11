var SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var action   = p.action   || 'getTurnoActivo';
  var callback = p.callback || '';
  var result;

  try {
    if (action === 'getTurnoActivo') {
      result = getTurnoActivoData();

    } else if (action === 'insert') {
      result = insertPedido(p);

    } else if (action === 'updateStatus') {
      result = updateCol(p.id, 11, p.estado);

    } else if (action === 'updateEstadoPago') {
      result = updateCol(p.id, 13, p.estadoPago);

    } else if (action === 'updatePago') {
      result = updateCol(p.id, 10, p.pago);

    } else if (action === 'updateTipo') {
      result = updateCol(p.id, 4, p.tipo);   // col 4 = Tipo

    } else if (action === 'updateTel') {
      result = updateCol(p.id, 5, p.tel);    // col 5 = Telefono

    } else if (action === 'updateNotas') {
      result = updateCol(p.id, 12, p.notas); // col 12 = Notas

    } else if (action === 'updateDelivery') {
      var ss2   = SpreadsheetApp.openById(SHEET_ID);
      var sh2   = getOrCreateSheet(ss2, 'Pedidos');
      var rows  = sh2.getDataRange().getValues();
      var del   = parseFloat(p.delivery) || 0;
      var tot   = parseFloat(p.total)    || 0;
      var found = false;
      for (var i = 1; i < rows.length; i++) {
        if (sameId(rows[i][0], p.id)) {
          sh2.getRange(i + 1, 8).setValue(del);
          sh2.getRange(i + 1, 9).setValue(tot);
          found = true;
          break;
        }
      }
      result = found
        ? { ok: true }
        : { ok: false, error: 'ID no encontrado: ' + p.id };

    } else if (action === 'abrirTurno') {
      result = abrirTurnoAction(p);

    } else if (action === 'cerrarTurno') {
      result = cerrarTurnoAction(p);

    } else {
      result = { ok: false, error: 'Accion desconocida: ' + action };
    }

  } catch (err) {
    result = { ok: false, error: err.toString() };
  }

  var json = JSON.stringify(result);
  var output;
  if (callback) {
    output = ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    output = ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  }
  return output;
}

function doPost(e) {
  var p;
  try {
    p = JSON.parse(e.postData.contents);
  } catch (err) {
    p = {};
  }
  return doGet({ parameter: p });
}

// Compara IDs en cualquier formato: "#014" === "14" === 14
function sameId(cellVal, searchId) {
  var cell   = String(cellVal).replace(/^#0*/, '').trim();
  var search = String(searchId).replace(/^#0*/, '').trim();
  return cell === search;
}

function getOrCreateSheet(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (name === 'Pedidos') {
      sh.getRange(1, 1, 1, 15).setValues([[
        'ID', 'Fecha', 'Hora', 'Tipo', 'Telefono', 'Productos',
        'Subtotal', 'Delivery', 'Total', 'Pago', 'Estado',
        'Notas', 'Estado Pago', 'Turno ID', 'Fecha ISO'
      ]]);
    } else if (name === 'Turnos') {
      sh.getRange(1, 1, 1, 6).setValues([[
        'Turno ID', 'Inicio', 'Fin', 'Total Pedidos', 'Recaudado', 'Estado'
      ]]);
    }
  }
  return sh;
}

function updateCol(id, col, val) {
  var ss   = SpreadsheetApp.openById(SHEET_ID);
  var sh   = getOrCreateSheet(ss, 'Pedidos');
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (sameId(data[i][0], id)) {
      sh.getRange(i + 1, col).setValue(val);
      return { ok: true };
    }
  }
  return { ok: false, error: 'ID no encontrado: ' + id };
}

function parseProdStr(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return [];
  }
}

function getTurnoActivoData() {
  var ss  = SpreadsheetApp.openById(SHEET_ID);
  var shT = getOrCreateSheet(ss, 'Turnos');
  var shP = getOrCreateSheet(ss, 'Pedidos');

  var turnos      = shT.getDataRange().getValues();
  var turnoActivo = null;

  for (var i = turnos.length - 1; i >= 1; i--) {
    if (String(turnos[i][5]).toLowerCase() === 'activo') {
      turnoActivo = {
        id:     turnos[i][0],
        inicio: turnos[i][1],
        estado: turnos[i][5]
      };
      break;
    }
  }

  if (!turnoActivo) {
    return { ok: true, turno: null, pedidos: [], maxId: 0 };
  }

  var pedidos = shP.getDataRange().getValues();
  var result  = [];

  for (var j = 1; j < pedidos.length; j++) {
    var row = pedidos[j];
    if (String(row[13]) === String(turnoActivo.id)) {
      var rawId = String(row[0]).replace(/^#0*/, '').trim();
      if (!rawId || rawId === 'null' || rawId === 'undefined') continue;
      var numId = parseInt(rawId) || rawId;
      result.push({
        id:         numId,
        fecha:      row[14] || row[1],
        tipo:       row[3],
        tel:        row[4],
        products:   parseProdStr(row[5]),
        subtotal:   parseFloat(row[6])  || 0,
        delivery:   parseFloat(row[7])  || 0,
        total:      parseFloat(row[8])  || 0,
        pago:       row[9],
        estado:     row[10],
        notas:      row[11],
        estadoPago: row[12],
        turnoId:    row[13]
      });
    }
  }

  // maxId global para evitar IDs duplicados entre dispositivos
  var allRows = shP.getDataRange().getValues();
  var maxId = 0;
  for (var k = 1; k < allRows.length; k++) {
    var rawId2 = String(allRows[k][0]).replace(/^#0*/, '').trim();
    var numId2 = parseInt(rawId2) || 0;
    if (numId2 > maxId) maxId = numId2;
  }

  return { ok: true, turno: turnoActivo, pedidos: result, maxId: maxId };
}

function insertPedido(p) {
  var ss  = SpreadsheetApp.openById(SHEET_ID);
  var sh  = getOrCreateSheet(ss, 'Pedidos');
  var now = new Date();
  sh.appendRow([
    p.id,
    Utilities.formatDate(now, 'America/Lima', 'dd/MM/yyyy'),
    Utilities.formatDate(now, 'America/Lima', 'HH:mm:ss'),
    p.tipo,
    p.tel,
    p.products,
    parseFloat(p.subtotal)  || 0,
    parseFloat(p.delivery)  || 0,
    parseFloat(p.total)     || 0,
    p.pago,
    p.estado,
    p.notas      || '',
    p.estadoPago || 'Pendiente',
    p.turnoId,
    p.fecha      || now.toISOString()
  ]);
  return { ok: true };
}

function abrirTurnoAction(p) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = getOrCreateSheet(ss, 'Turnos');
  sh.appendRow([p.turnoId, p.inicio, '', 0, 0, 'Activo']);
  return { ok: true };
}

function cerrarTurnoAction(p) {
  var ss   = SpreadsheetApp.openById(SHEET_ID);
  var sh   = getOrCreateSheet(ss, 'Turnos');
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.turnoId)) {
      sh.getRange(i + 1, 3).setValue(p.fin);
      sh.getRange(i + 1, 4).setValue(parseInt(p.totalPedidos)  || 0);
      sh.getRange(i + 1, 5).setValue(parseFloat(p.recaudado)   || 0);
      sh.getRange(i + 1, 6).setValue('Cerrado');
      return { ok: true };
    }
  }
  return { ok: false, error: 'Turno no encontrado: ' + p.turnoId };
}
