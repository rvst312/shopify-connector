window.check_listado = true;
const url_consulta = "https://dp.tradeinn.com";
const url_elastic_sr = "https://sr.tradeinn.com";
var paginacio = 96;
var subfam_fixacions = [];
subfam_fixacions[0] = "18192";
subfam_fixacions[1] = "18193";
subfam_fixacions[2] = "18194";
subfam_fixacions[3] = "19298";
var cesta_js = [];
var array_filtros_packs = [];
var subfam_esquis = [];
var is_subfamilia_pack = false;
subfam_esquis[0] = "18189";
subfam_esquis[1] = "18190";
subfam_esquis[2] = "18188";
subfam_esquis[3] = "19297";
var datos_pack = [];
var result_codigos_descuento = "";
async function onloadPageHome(modUrl, pagination) {
  let currURL = window.location.href.split("#");
  let page_subfamilia_pack = false;
  let info_subfamilia = [];
  let id_tienda = document.getElementById("id_tienda").value;
  if (currURL[0].slice(-2) == "/s") {
    let res = currURL[0].split("/");
    let id_subfamilia = res[res.length - 2].trim();
    document.getElementById("id_subfamilia").value = id_subfamilia;
    info_subfamilia = get_info_subfamilia(id_subfamilia, true);
    if (typeof info_subfamilia["subfamilias_pack"] !== "undefined") {
      is_subfamilia_pack =
        info_subfamilia["subfamilias_pack"].length > 0 ? true : false;
    } else {
      is_subfamilia_pack = false;
    }
  }
  let filtro = document.getElementById("url_search").value;
  if (modUrl == 1) {
    changeUrl(filtro);
  }
  mostrar_spinner();
  leer_url();
  let vars_json = get_params_elastic(modUrl);
  filtro = document.getElementById("url_search").value;
  let vars_filtro = vars_json[0];
  let vars_excluir = vars_json[1];
  let vars_source = vars_json[2];
  let vars_sort = vars_json[3];
  let vars_post_filter = vars_json[7];
  let size = vars_json[4];
  let vars_from = vars_json[8];
  let query = await get_query_elastic(
    size,
    vars_source,
    vars_excluir,
    vars_sort,
    vars_filtro,
    vars_post_filter,
    vars_from
  );
  let response = await get_info_elastic(query);
  let total_prods = response.hits.total["value"];
  document.getElementById("total_results").value = total_prods;
  let num_pagines = Math.ceil(total_prods / paginacio);
  if (num_pagines > 1) {
    let list_start = filtro.split("start=");
    if (typeof list_start[1] !== "undefined") {
      let list_start_aux = list_start[1].split("&");
      let start = list_start_aux[0];
      let paux = "";
      if (start == 0) {
        paux = paginacio;
      } else {
        paux = parseInt(start) + parseInt(paginacio);
      }
      let num_actual = start / paginacio + 1;
      if (num_actual <= num_pagines) {
        document.getElementById("num_pagina").value = paux;
      }
    } else {
      document.getElementById("num_pagina").value = paginacio;
    }
  } else {
    document.getElementById("num_pagina").value = paginacio;
  }
  document.getElementById("done").value = 0;
  let item_list = "";
  let list_marcas = [];
  let index_array_filtros_packs = "";
  if (currURL[0].slice(-2) == "/s" && id_tienda != 9) {
    let filtros_sel = document.getElementById("filtros_sel").value;
    let list_sel = filtros_sel.split("#");
    let filtre_subfamilia = false;
    for (let i = 1; i < list_sel.length; i++) {
      let fl = list_sel[i].charAt(0);
      if (fl == "c") {
        let fr = list_sel[i].slice(1, list_sel[i].length);
        if (fr == id_subfamilia) {
          filtre_subfamilia = true;
        }
      }
    }
    list_marcas = JSON.parse(get_item_storage("marcas"));
  } else {
    if (
      !document
        .getElementById("js_packs-container")
        .classList.contains("-visibility")
    ) {
      document
        .getElementById("js_packs-container")
        .classList.add("-novisibility");
      document
        .getElementById("js_packs-container")
        .classList.remove("-visibility");
    }
  }
  if (total_prods > 0) {
    item_list = await pintar_productos(
      "js-producto-listado-grid",
      page_subfamilia_pack,
      response,
      info_subfamilia,
      index_array_filtros_packs,
      list_marcas
    );
    if (
      document
        .getElementById("js-loading")
        .classList.contains("-novisibility") &&
      total_prods > paginacio
    ) {
      document.getElementById("js-loading").classList.remove("-novisibility");
    }
  } else {
    item_list = get_var_storage("t_no_results");
    if (
      !document.getElementById("js-loading").classList.contains("-novisibility")
    ) {
      document.getElementById("js-loading").classList.add("-novisibility");
    }
  }
  if (pagination == 0) {
    document.getElementById("js-producto-listado-grid").innerHTML = "";
    document.getElementById("js-producto-listado-grid").innerHTML = item_list;
    if (modUrl == 1) {
      irTop();
    }
  } else {
    document.getElementById("js-producto-listado-grid").innerHTML += item_list;
  }
  esconder_spinner();
  actualizar_filtros(response.aggregations);
  if (modUrl == 0) {
    var pathName = document.location.pathname;
    if (get_item_storage("scrollPosition_" + pathName) !== null) {
      scrollSearch = get_item_storage("scrollPosition_" + pathName);
      if (scrollSearch == 0) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        var scrollList = document.getElementById(scrollSearch + "_list");
        if (scrollList) {
          let scrollTop =
            scrollList.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: scrollTop, behavior: "smooth" });
        }
      }
    }
  }
}
function leer_url() {
  let list_search = window.location.href.split("#");
  let tipus = "";
  let tipus2 = "";
  let id_tienda = document.getElementById("id_tienda").value;
  if (id_tienda == 0) {
    id_tienda = 4;
  }
  let var_filtre = "";
  let var_excluir = "";
  let var_sort = "";
  let var_post_filter = "";
  let filtro = "";
  if (list_search.length == 1) {
    let pathname = window.location.pathname;
    let res = pathname.split("/");
    let id_subfamilia = "";
    let id_campana = "";
    let id_familia = "";
    let id_marca = "";
    let num_filtros = 0;
    tipus = res[res.length - 1].trim();
    var_sort = "v30_sum;desc@tm" + id_tienda + ";asc";
    if (tipus == "s") {
      id_subfamilia = res[res.length - 2].trim();
      if (id_tienda == 9) {
        id_campana = id_subfamilia;
        if (id_campana == 149) {
          var_filtre = "exist=1@fecha_descatalogado=[*-now/d]@v30=0";
          var_excluir =
            "id_subfamilia_e=99961,99962,99963,99964,99965,99966,99967,99968,999610,999611,999612,999613,999614";
        } else {
          var_filtre = "id_campana=" + id_campana;
        }
      } else {
        let info_subfamilia = get_info_subfamilia(id_subfamilia, false);
        id_familia = info_subfamilia["id_familia"];
        var_post_filter = "id_subfamilia=" + id_subfamilia;
        var_filtre = "id_familia=" + id_familia;
        num_filtros = 1;
        document.getElementById("id_subfamilia").value = id_subfamilia;
      }
    } else if (tipus == "m") {
      id_marca = res[res.length - 2].trim();
      var_filtre = "id_tienda=" + id_tienda;
      var_post_filter = "marca=" + id_marca;
      num_filtros = 1;
      var_sort = "order_rec;asc@v30_sum;desc";
    } else {
      var_filtre = "id_tienda=" + id_tienda;
      num_filtros = 1;
      var_sort = "order_rec;asc@v30_sum;desc";
    }
    document.getElementById("num_filtros_sel").innerHTML = num_filtros;
    filtro =
      "fq=" +
      var_filtre +
      "&sort=" +
      var_sort +
      "&fe=" +
      var_excluir +
      "&pf=" +
      var_post_filter;
  } else {
    filtro = list_search[1];
  }
  let filtro_aux = filtro.replace(/%22/g, '"');
  filtro_aux = filtro_aux.replace(/%20/g, " ");
  document.getElementById("url_search").value = filtro_aux;
  get_filtros_sel_url();
}
function create_order_b2b() {
  mostrar_spinner();
  const fileInput = document.getElementById("csv_order");
  const id_tienda = document.getElementById("id_tienda").value;
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);
    const response = fetch(
      "/checkout.php?action=create_order&id_tienda=" +
        id_tienda +
        "&id_pais=" +
        info_pais["id_pais"],
      { method: "POST", body: formData }
    ).then((response) => {
      window.location.href =
        "/" +
        document.getElementById("nombre_tienda_url_top").value +
        "?action=ver_cesta";
    });
  }
}
async function export_b2b() {
  mostrar_spinner();
  var valor_tienda = document.getElementById("id_tienda_export").value;
  const response = await fetch("/?action=export&id_tienda=" + valor_tienda);
  const reader = response.body.getReader();
  let receivedLength = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedLength += value.length;
  }
  let chunksAll = new Uint8Array(receivedLength);
  let position = 0;
  for (let chunk of chunks) {
    chunksAll.set(chunk, position);
    position += chunk.length;
  }
  const blob = new Blob([chunksAll]);
  const urlBlob = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = urlBlob;
  a.download = "file.csv";
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(urlBlob);
  esconder_spinner();
}
function downloadCSV(csvContent, fileName) {
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", fileName);
  a.click();
}
function get_params_elastic(modUrl) {
  let var_filtre = "";
  let var_sort = "";
  let var_excluir = "";
  let var_post_filter = "";
  let vars_source = "";
  let var_from = 0;
  let var_num_rows = "96";
  let filtro = document.getElementById("url_search").value;
  let idioma = document.getElementById("idioma").value;
  let id_tienda = document.getElementById("id_tienda").value;
  if (id_tienda == 0) {
    id_tienda = 4;
  }
  let var_from_aux = filtro.split("start=");
  if (var_from_aux.length > 1) {
    let var_from_aux2 = var_from_aux[1].split("&");
    if (modUrl == 0) {
      var_num_rows = parseInt(var_from_aux2[0]) + parseInt(96);
    } else {
      var_from = var_from_aux2[0];
    }
  }
  let list_filtros = filtro.split("&");
  for (let lf = 0; lf < list_filtros.length; lf++) {
    let list_fq = list_filtros[lf].split("fq=");
    if (list_fq.length > 1) {
      var_filtre = list_fq[1];
    }
    let list_sort = list_filtros[lf].split("sort=");
    if (list_sort.length > 1) {
      var_sort = list_sort[1];
    }
    let list_fe = list_filtros[lf].split("fe=");
    if (list_fe.length > 1) {
      var_excluir = list_fe[1];
    }
    let list_pf = list_filtros[lf].split("pf=");
    if (list_pf.length > 1) {
      var_post_filter = list_pf[1];
    }
  }
  vars_source =
    "productes;model." +
    idioma +
    ";model.eng;id_marca;image_created;sostenible;fecha_descatalogado;id_marca;video_mp4;tres_sesenta;productes.talla;productes.talla2;id_modelo;familias.id_familia;familias.subfamilias.id_tienda;familias.subfamilias.id_subfamilia;atributos_padre.atributos;productes.baja;productes.id_producte;productes.desc_brand;productes.brut;productes.exist;productes.pmp;productes.rec;productes.stock_reservat;productes.v30;productes.v90;productes.v180;productes.v360;productes.ean;id_subfamilia_principal;productes.color;id_producte_pais_win." +
    info_pais["id_pais"] +
    ";precio_win_" +
    info_pais["id_pais"] +
    ";marca;productes.sellers.id_seller";
  var vars_json = [];
  vars_json[0] = var_filtre;
  vars_json[1] = var_excluir;
  vars_json[2] = vars_source;
  vars_json[3] = var_sort;
  vars_json[4] = var_num_rows;
  vars_json[5] = "productos";
  vars_json[6] = "search";
  vars_json[7] = var_post_filter;
  if (id_tienda == 777) {
    vars_json[7] = var_post_filter + "@id_tienda=17,18,19,20,21,22,23,24,25,26";
  }
  vars_json[8] = var_from;
  return vars_json;
}
async function get_query_elastic(
  size,
  vars_source,
  vars_excluir,
  vars_sort,
  vars_filtro,
  vars_post_filter,
  vars_from
) {
  let f_familia = "";
  if (vars_filtro != "") {
    let list_filters = vars_filtro.split("@");
    list_filters.forEach((value) => {
      if (value != "") {
        let list_valores = value.split("=");
        if (list_valores[0] == "id_familia") {
          f_familia = list_valores[1];
        }
      }
    });
  }
  let solo_stock_tr = 0;
  let solo_seller = 0;
  let f_categorias = "";
  let f_marcas = "";
  let f_tallas = "";
  let f_tallas_2 = "";
  let f_tallas_pais = "";
  let f_atributos = "";
  if (vars_post_filter != "") {
    let list_post_filters = vars_post_filter.split("@");
    list_post_filters.forEach((value) => {
      if (value != "") {
        let list_valores = value.split("=");
        if (list_valores[0] == "id_subfamilia") {
          f_categorias = list_valores[1];
        } else if (list_valores[0] == "marca") {
          f_marcas = list_valores[1];
        } else if (list_valores[0] == "talla") {
          f_tallas = list_valores[1];
        } else if (list_valores[0] == "talla2") {
          f_tallas_2 = list_valores[1];
        } else if (list_valores[0] == "talla_" + info_pais["talla_code"]) {
          f_tallas_pais = list_valores[1];
        } else if (list_valores[0] == "atributos") {
          f_atributos = list_valores[1];
        } else if (list_valores[0] == "exist") {
          solo_stock_tr = 1;
          if (vars_filtro != "") {
            vars_filtro += "@exist=1";
          } else {
            vars_filtro = "exist=1";
          }
        } else if (list_valores[0] == "solo_seller") {
          solo_seller = 1;
        }
      }
    });
  }
  let array_filtro_atributos = [];
  if (f_atributos != "") {
    let list_f_atributos = f_atributos.split(",");
    for (let i = 0; i < list_f_atributos.length; i++) {
      let list_atr_val = list_f_atributos[i].split("_");
      if (!array_filtro_atributos.hasOwnProperty(list_atr_val[0])) {
        array_filtro_atributos[list_atr_val[0]] = [];
        array_filtro_atributos[list_atr_val[0]]["id_atr_valores"] = [];
      }
      array_filtro_atributos[list_atr_val[0]]["operador"] = list_atr_val[2];
      array_filtro_atributos[list_atr_val[0]]["id_atr_valores"].push(
        list_atr_val[1]
      );
    }
  }
  let post_filters = [];
  let filtro_familia = "";
  if (f_familia != "") {
    filtro_familia = get_filtro_familia(f_familia);
  }
  let filtro_categorias = "";
  if (f_categorias != "") {
    filtro_categorias = get_filtro_categorias(f_categorias);
    post_filters.push(filtro_categorias);
  }
  let filtro_marcas = "";
  if (f_marcas != "") {
    filtro_marcas = get_filtro_marcas(f_marcas);
    post_filters.push(filtro_marcas);
  }
  let filtro_tallas = "";
  if (f_tallas != "") {
    filtro_tallas = get_filtro_tallas(f_tallas, solo_stock_tr);
    post_filters.push(filtro_tallas);
  }
  let filtro_tallas_pais = "";
  if (f_tallas_pais != "") {
    filtro_tallas_pais = get_filtro_tallas_pais(f_tallas_pais, solo_stock_tr);
    post_filters.push(filtro_tallas_pais);
  }
  let filtro_tallas_2 = "";
  if (f_tallas_2 != "") {
    filtro_tallas_2 = get_filtro_tallas_2(f_tallas_2, solo_stock_tr);
    post_filters.push(filtro_tallas_2);
  }
  let filtro_atributos = "";
  if (f_atributos != "") {
    filtro_atributos = get_filtro_atributos(array_filtro_atributos, "");
    filtro_atributos.forEach((value) => {
      post_filters.push(value);
    });
  }
  let aggregation_categorias = [];
  let aggregation_marca = [];
  let aggregation_tallas = [];
  let aggregation_tallas_pais = [];
  let aggregation_tallas_2 = [];
  let aggregation_atributos = [];
  aggregation_categorias = get_aggregation_categorias(
    filtro_marcas,
    filtro_tallas,
    filtro_atributos,
    filtro_tallas_pais,
    filtro_tallas_2,
    f_familia
  );
  aggregation_marca = get_aggregation_marca(
    filtro_categorias,
    filtro_tallas,
    filtro_atributos,
    filtro_tallas_pais,
    filtro_tallas_2
  );
  aggregation_tallas = get_aggregation_tallas(
    filtro_categorias,
    filtro_marcas,
    filtro_atributos,
    filtro_tallas_2
  );
  aggregation_tallas_pais = get_aggregation_tallas_pais(
    filtro_categorias,
    filtro_marcas,
    filtro_atributos,
    filtro_tallas_2
  );
  aggregation_tallas_2 = get_aggregation_tallas_2(
    filtro_categorias,
    filtro_marcas,
    filtro_atributos,
    filtro_tallas,
    filtro_tallas_pais
  );
  aggregation_atributos = get_aggregation_atributos(
    filtro_categorias,
    filtro_marcas,
    filtro_tallas,
    filtro_tallas_pais,
    filtro_tallas_2
  );
  let query = construir_query_elastic(
    vars_filtro,
    vars_excluir,
    vars_source,
    vars_sort,
    size,
    vars_from,
    true,
    solo_seller
  );
  let array_atributos_padres = [];
  if (f_atributos != "") {
    let aggregation_atributos_padre = [];
    aggregation_atributos_padre = get_aggregation_atributos_padre(
      filtro_categorias,
      filtro_marcas,
      filtro_tallas,
      filtro_tallas_pais,
      filtro_tallas_2,
      filtro_familia
    );
    let query_atr = construir_query_elastic("", "", "", "", 0, 0, true, 0);
    query_atr["aggregations"] = {};
    query_atr["aggregations"]["group_by_atributos"] =
      aggregation_atributos_padre;
    let response_atributs = await get_info_elastic(query_atr);
    array_atributos_padres = get_atributos_padres(response_atributs);
  }
  if (post_filters != "") {
    query["post_filter"] = {};
    query["post_filter"]["bool"] = {};
    query["post_filter"]["bool"]["filter"] = post_filters;
  }
  query["aggregations"] = {};
  query["aggregations"]["group_by_marca"] = aggregation_marca;
  query["aggregations"]["group_by_categorias"] = aggregation_categorias;
  query["aggregations"]["group_by_tallas"] = aggregation_tallas;
  query["aggregations"]["group_by_tallas_2"] = aggregation_tallas_2;
  if (!Array.isArray(aggregation_tallas_pais)) {
    query["aggregations"]["group_by_tallas_pais"] = aggregation_tallas_pais;
  }
  if (array_atributos_padres.length > 0) {
    for (let key in array_atributos_padres) {
      if (array_atributos_padres.hasOwnProperty(key)) {
        query["aggregations"][key] = get_aggregation_atributos_valores(
          key,
          array_filtro_atributos,
          filtro_categorias,
          filtro_marcas,
          filtro_tallas,
          filtro_tallas_pais,
          filtro_tallas_2
        );
      }
    }
  } else {
    query["aggregations"]["group_by_atributos"] = aggregation_atributos;
  }
  return query;
}
async function get_info_elastic(query) {
  const options = {
    method: "POST",
    body: JSON.stringify(query),
    mode: "cors",
    cache: "no-cache",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
  };
  let elasticResponse = await fetch(url_elastic_sr, options);
  let response = elasticResponse.json();
  return response;
}
function construir_query_elastic(
  vars_filtro,
  vars_excluir,
  vars_source,
  vars_sort,
  size,
  from,
  solo_stock,
  solo_seller
) {
  let id_tienda = document.getElementById("id_tienda").value;
  let idioma = document.getElementById("idioma").value;
  let nombre_buscar = "model." + idioma;
  let return_query = {
    from: from,
    size: size,
    query: { bool: { filter: [{ range: { image_created: { gt: 0 } } }] } },
  };
  if (solo_stock) {
    let add_filtro_solo_stock = "";
    if (info_pais["id_pais"] == 75) {
      add_filtro_solo_stock = {
        nested: {
          path: "productes.sellers",
          query: {
            bool: {
              must: [
                { range: { "productes.sellers.stock_de": { gt: 0 } } },
                {
                  nested: {
                    path: "productes.sellers.precios_paises",
                    query: {
                      match: {
                        "productes.sellers.precios_paises.id_pais":
                          info_pais["id_pais"],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      };
    } else {
      add_filtro_solo_stock = {
        nested: {
          path: "productes.sellers",
          query: {
            bool: {
              must: [
                { range: { "productes.sellers.stock": { gt: 0 } } },
                {
                  nested: {
                    path: "productes.sellers.precios_paises",
                    query: {
                      match: {
                        "productes.sellers.precios_paises.id_pais":
                          info_pais["id_pais"],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      };
    }
    return_query["query"]["bool"]["filter"].push(add_filtro_solo_stock);
    add_filtro_solo_stock = {
      nested: {
        path: "productes",
        query: { term: { "productes.baja": { value: 0 } } },
      },
    };
    return_query["query"]["bool"]["filter"].push(add_filtro_solo_stock);
  }
  let add_filtro_solo_seller = {
    nested: {
      path: "productes.sellers",
      query: {
        bool: {
          must: [{ term: { "productes.sellers.id_seller": { value: 1 } } }],
        },
      },
    },
  };
  return_query["query"]["bool"]["filter"].push(add_filtro_solo_seller);
  if (vars_filtro != "") {
    let list_filtro = vars_filtro.split("@");
    let term = "";
    list_filtro.forEach((valor) => {
      let un_filtro = valor.split("=");
      if (un_filtro[0] == "id_marca") {
        let list_marcas = un_filtro[1].split(",");
        if (list_marcas.length == 1) {
          term = { term: { id_marca: { value: un_filtro[1] } } };
        } else {
          term = { terms: { id_marca: [] } };
          list_marcas.forEach((id_marca) => {
            term["terms"]["id_marca"].push(id_marca);
          });
        }
      } else if (un_filtro[0] == "modelo") {
        term = {
          term: { [`model.${idioma}.keyword`]: { value: un_filtro[1] } },
        };
      } else if (un_filtro[0] == "id_familia") {
        term = {
          nested: {
            path: "familias",
            query: { term: { "familias.id_familia": { value: un_filtro[1] } } },
          },
        };
      } else if (un_filtro[0] == "id_subfamilia") {
        let list_subfamilias = un_filtro[1].split(",");
        if (list_subfamilias.length == 1) {
          term = {
            nested: {
              path: "familias.subfamilias",
              query: {
                term: {
                  "familias.subfamilias.id_subfamilia": { value: un_filtro[1] },
                },
              },
            },
          };
        } else {
          term = {
            nested: {
              path: "familias.subfamilias",
              query: { terms: { "familias.subfamilias.id_subfamilia": {} } },
            },
          };
          list_subfamilias.forEach((id_subfam) => {
            term["nested"]["query"]["terms"][
              "familias.subfamilias.id_subfamilia"
            ].push(id_subfam);
          });
        }
      } else if (un_filtro[0] == "id_tienda") {
        term = {
          nested: {
            path: "familias.subfamilias",
            query: { terms: { "familias.subfamilias.id_tienda": [] } },
          },
        };
        let array_idtienda = un_filtro[1].split(",");
        array_idtienda.forEach((id_tienda_fil) => {
          term["nested"]["query"]["terms"][
            "familias.subfamilias.id_tienda"
          ].push(id_tienda_fil);
        });
      } else if (un_filtro[0] == "id_modelo") {
        term = { terms: { id_modelo: [] } };
        let list_idmodelos = un_filtro[1].split(",");
        list_idmodelos.forEach((id_modelo) => {
          term["terms"]["id_modelo"].push(id_modelo);
        });
      } else if (un_filtro[0] == "atributos") {
        let list_atributos = un_filtro[1].split("##");
        for (var key = 0; key < list_atributos.length; key++) {
          var valor = list_atributos[key];
          var list_atr = valor.split("||");
          var list_atr_valor = list_atr[1].split(";");
          term = {
            nested: {
              path: "atributos_padre.atributos",
              query: { bool: { should: [], minimum_should_match: 1 } },
            },
          };
          for (
            var key_atr_valor = 0;
            key_atr_valor < list_atr_valor.length;
            key_atr_valor++
          ) {
            var value_atr_valor = list_atr_valor[key_atr_valor];
            term_value = {
              term: {
                "atributos_padre.atributos.id_atribut_valor": {
                  value: value_atr_valor,
                },
              },
            };
            term.nested.query.bool.should.push(term_value);
          }
          return_query["query"]["bool"]["must"].push(term);
        }
      } else if (un_filtro[0] == "fecha_descatalogado") {
        un_filtro[1] = un_filtro[1].replace("[", "");
        un_filtro[1] = un_filtro[1].replace("]", "");
        let list_valors = un_filtro[1].split("-");
        if (list_valors[0].indexOf("T") >= 0) {
          list_valors[0] = list_valors[0].replace("/", "-");
        } else {
          list_valors[0] = list_valors[0].replace(":", "-");
        }
        if (list_valors[1].indexOf("T") >= 0) {
          list_valors[1] = list_valors[1].replace("/", "-");
        } else {
          list_valors[1] = list_valors[1].replace(":", "-");
        }
        if (list_valors[1] == "*") {
          term = { range: { fecha_descatalogado: { gte: list_valors[0] } } };
        } else if (list_valors[0] == "*") {
          term = { range: { fecha_descatalogado: { lte: list_valors[1] } } };
        } else {
          term = {
            range: {
              fecha_descatalogado: { gte: list_valors[0], lte: list_valors[1] },
            },
          };
        }
      } else if (un_filtro[0] == "fecha_primera_alta_modelo") {
        un_filtro[1] = un_filtro[1].replace("[", "");
        un_filtro[1] = un_filtro[1].replace("]", "");
        let list_valors = un_filtro[1].split("-");
        if (list_valors[0].indexOf("T") >= 0) {
          list_valors[0] = list_valors[0].replace("/", "-");
        } else {
          list_valors[0] = list_valors[0].replace(":", "-");
        }
        if (list_valors[1].indexOf("T") >= 0) {
          list_valors[1] = list_valors[1].replace("/", "-");
        } else {
          list_valors[1] = list_valors[1].replace(":", "-");
        }
        if (list_valors[1] == "*") {
          term = {
            range: { fecha_primera_alta_modelo: { gte: list_valors[0] } },
          };
        } else if (list_valors[0] == "*") {
          term = {
            range: { fecha_primera_alta_modelo: { lte: list_valors[1] } },
          };
        } else {
          term = {
            range: {
              fecha_primera_alta_modelo: {
                gte: list_valors[0],
                lte: list_valors[1],
              },
            },
          };
        }
      } else if (
        (id_tienda <= 17 && un_filtro[0].slice(0, 2) === "tm") ||
        un_filtro[0] == "order_rec"
      ) {
        un_filtro[1] = un_filtro[1].replace("[", "");
        un_filtro[1] = un_filtro[1].replace("]", "");
        let list_valors = un_filtro[1].split("-");
        if (list_valors[1] == "*") {
          term = { range: { [un_filtro[0]]: { gte: list_valors[0] } } };
        } else if (list_valors[0] == "*") {
          term = { range: { [un_filtro[0]]: { lte: list_valors[1] } } };
        } else {
          term = {
            range: {
              [un_filtro[0]]: { gte: list_valors[0], lte: list_valors[1] },
            },
          };
        }
      } else if (un_filtro[0] == "exist") {
        term = {
          nested: {
            path: "productes",
            query: {
              script: {
                script:
                  "(doc['productes.exist'].value - doc['productes.stock_reservat'].value) > 0",
              },
            },
          },
        };
      } else if (un_filtro[0] == "v30") {
        if (un_filtro[1].indexOf("[") < 0) {
          term = {
            nested: {
              path: "productes",
              query: { term: { "productes.v30": { value: un_filtro[1] } } },
            },
          };
        } else {
          un_filtro[1] = un_filtro[1].replace("[", "");
          un_filtro[1] = un_filtro[1].replace("]", "");
          let list_valors = un_filtro[1].split("-");
          if (list_valors[1] == "*") {
            term = {
              nested: {
                path: "productes",
                query: { range: { "productes.v30": { gte: list_valors[0] } } },
              },
            };
          } else {
            term = {
              nested: {
                path: "productes",
                query: {
                  range: {
                    "productes.v30": {
                      gte: list_valors[0],
                      lte: list_valors[1],
                    },
                  },
                },
              },
            };
          }
        }
      } else if (un_filtro[0] == "v180,v360") {
        term = {
          nested: {
            path: "productes",
            query: {
              bool: {
                should: [
                  { term: { "productes.v180": { value: un_filtro[1] } } },
                  { term: { "productes.v30": { value: "0" } } },
                ],
                minimum_should_match: 1,
              },
            },
          },
        };
      }
      if (!return_query["query"]["bool"]["must"]) {
        return_query["query"]["bool"]["must"] = [];
      }
      return_query["query"]["bool"]["must"].push(term);
    });
  }
  vars_excluir = "id_marca_e=78,147,9936,51,869,34,21292,12268";
  if (vars_excluir != "") {
    return_query["query"]["bool"]["must_not"] = [];
    let list_excluir = vars_excluir.split("@");
    list_excluir.forEach((valor) => {
      let un_filtro = valor.split("=");
      if (un_filtro[0] == "id_modelo_e") {
        term = { terms: { id_modelo: [] } };
        var list_idmodelos = un_filtro[1].split(",");
        for (var key = 0; key < list_idmodelos.length; key++) {
          var id_mod = list_idmodelos[key];
          term.terms.id_modelo.push(id_mod);
        }
      } else if (un_filtro[0] === "id_marca_e") {
        var term = { terms: { id_marca: [] } };
        var list_idmarcas = un_filtro[1].split(",");
        list_idmarcas.forEach((id_mar) => {
          if (id_mar != "") term["terms"]["id_marca"].push(id_mar);
        });
      } else if (un_filtro[0] == "id_subfamilia_e") {
        term = {
          nested: {
            path: "familias.subfamilias",
            query: { terms: { "familias.subfamilias.id_subfamilia": [] } },
          },
        };
        let list_idsubfam = un_filtro[1].split(",");
        list_idsubfam.forEach((id_subfam) => {
          term["nested"]["query"]["terms"][
            "familias.subfamilias.id_subfamilia"
          ].push(id_subfam);
        });
      } else if (un_filtro[0] == "id_tienda_e") {
        term = {
          nested: {
            path: "familias.subfamilias",
            query: { terms: { "familias.subfamilias.id_tienda": [] } },
          },
        };
        let list_idsubfam = un_filtro[1].split(",");
        list_idsubfam.forEach((id_subfam) => {
          term["nested"]["query"]["terms"][
            "familias.subfamilias.id_tienda"
          ].push(id_subfam);
        });
      } else if (un_filtro[0] == "atributos_e") {
        term = {
          nested: {
            path: "atributos_padre.atributos",
            query: {
              terms: { "atributos_padre.atributos.id_atribut_valor": [] },
            },
          },
        };
        let list_atr_valor_not = un_filtro[1].split(",");
        list_atr_valor_not.forEach((id_atr_not) => {
          term["nested"]["query"]["terms"][
            "atributos_padre.atributos.id_atribut_valor"
          ].push(id_atr_not);
        });
      }
      return_query["query"]["bool"]["must_not"].push(term);
    });
  }
  if (vars_source != "") {
    return_query["_source"] = { includes: [] };
    let list_source = vars_source.split(";");
    list_source.forEach((value) => {
      return_query["_source"]["includes"].push(value);
    });
  }
  if (vars_sort != "" && id_tienda != 9) {
    let array_sorting = [];
    let list_sort_options = vars_sort.split("@");
    for (let k = 0; k < list_sort_options.length; k++) {
      let list_sort = list_sort_options[k].split(";");
      if (list_sort[0].indexOf("tm") >= 0 && id_tienda > 17) {
        continue;
      }
      let val_sort = list_sort[0];
      if (list_sort[0] == "id_subfamilia_principal") {
        val_sort = "id_subfamilia_principal.keyword";
      }
      let query_sort_elastic = {};
      if (val_sort == "productes.sellers.id_seller") {
        query_sort_elastic[val_sort] = {
          order: list_sort[1],
          nested: { path: "productes.sellers" },
        };
      } else {
        query_sort_elastic[val_sort] = { order: list_sort[1] };
      }
      array_sorting.push(query_sort_elastic);
    }
    return_query["sort"] = array_sorting;
  }
  return return_query;
}
async function pintar_productos(
  contenedor,
  page_subfamilia_pack,
  response,
  info_subfamilia,
  index_array_filtros_packs,
  list_marcas
) {
  let idioma = document.getElementById("idioma").value;
  let item_list = "";
  let item_print = "";
  marcas = get_item_storage("marcas");
  response.hits.hits.forEach((item_info) => {
    let value = [];
    let obj = [];
    let obj2 = [];
    let list_images = [];
    let item = item_info["_source"];
    let list_products = item["productes"];
    obj["precio_" + info_pais.id_pais] =
      item["precio_win_" + info_pais.id_pais];
    value.precio_str = obj;
    value.tres_sesenta_bol = item["tres_sesenta"];
    value.sostenible_bol = item["sostenible"];
    value.id_modelo = item["id_modelo"];
    value.video_mp4 = item["video_mp4"];
    value.talla = "";
    value.id_marca = item["id_marca"];
    value.marca = item["marca"];
    value.productes = item["productes"];
    value.id_tienda = item["familias"][0]["subfamilias"]["id_tienda"];
    let modelo = "";
    if (typeof item["model"][idioma] !== "undefined") {
      modelo = item["model"][idioma];
    } else {
      modelo = item["model"]["eng"];
    }
    obj2[idioma] = modelo;
    value.model = obj2;
    let nombre_modelo = item["marca"] + " " + modelo;
    let nombre_modelo_normalizado_box = normalizar(nombre_modelo);
    let carpeta_div = parseInt(item["id_modelo"] / 1e4);
    value.src_photo =
      "https://tradeinn.com/h/" +
      carpeta_div +
      "/" +
      item["id_modelo"] +
      "/" +
      nombre_modelo_normalizado_box +
      ".webp";
    if (parseInt(item["image_created"]) >= 2) {
      let src_photo2 =
        "https://tradeinn.com/m/" +
        carpeta_div +
        "/" +
        item["id_modelo"] +
        "_2/" +
        nombre_modelo_normalizado_box +
        ".webp";
      list_images.push(src_photo2);
    }
    if (parseInt(item["image_created"]) >= 3) {
      let src_photo3 =
        "https://tradeinn.com/m/" +
        carpeta_div +
        "/" +
        item["id_modelo"] +
        "_3/" +
        nombre_modelo_normalizado_box +
        ".webp";
      list_images.push(src_photo3);
    }
    value.images_minis = list_images;
    let info_extra_product = get_info_extra_product(
      list_products,
      item["model"]["eng"],
      item["marca"]
    );
    value.talla = info_extra_product[0];
    let new_list_products = info_extra_product[3];
    value.label_discount = 0;
    let desc_brand = info_extra_product[1];
    let fecha_descatalogado = item["fecha_descatalogado"];
    let precio = item["precio_win_" + info_pais.id_pais];
    let id_prod_pais_win = item["id_producte_pais_win"];
    let rec = get_rec_id_producte_win(new_list_products, id_prod_pais_win);
    value.pack = 0;
    let seller_tradeinn = info_extra_product[2];
    let info_mostrar_pack = "";
    if (page_subfamilia_pack && seller_tradeinn) {
      let is_valido_pack = producto_valido_pack(
        info_subfamilia["subfamilias_pack"],
        item["familias"]
      );
      if (is_valido_pack) {
        info_mostrar_pack = get_info_mostrar_pack(
          item["familias"],
          item["atributos_padre"],
          info_subfamilia["subfamilias_pack"],
          index_array_filtros_packs,
          new_list_products,
          fecha_descatalogado,
          list_marcas[item["id_marca"]]
        );
        if (info_mostrar_pack["id_producte_pack"] != 99999) {
          datos_pack[item["id_modelo"]] = info_mostrar_pack;
          value.pack = 1;
        }
      }
    }
    if (contenedor == "js-producto-listado-grid") {
      id_producte_win = item["id_producte_pais_win"][info_pais.id_pais];
      lis = 0;
      precio_producto_trd = 0;
      while (lis < list_products.length) {
        if (list_products[lis]["id_producte"] == id_producte_win) {
          pmp = list_products[lis]["pmp"];
          v30 = list_products[lis]["v30"];
          v90 = list_products[lis]["v90"];
          v180 = list_products[lis]["v180"];
          v360 = list_products[lis]["v360"];
          exist = list_products[lis]["exist"];
          stock_reservat = list_products[lis]["stock_reservat"];
          lis2 = 0;
          trobat2 = false;
          while (!trobat2 && lis2 < list_products[lis]["sellers"].length) {
            if (list_products[lis]["sellers"][lis2]["id_seller"] == 1) {
              list_products[lis]["sellers"][lis2]["precios_paises"].forEach(
                (precios_producto) => {
                  if (precios_producto["id_pais"] == info_pais.id_pais) {
                    precio_producto_trd = precios_producto["precio"];
                  }
                }
              );
              trobat2 = true;
            }
            lis2++;
          }
        }
        lis++;
      }
      if (precio_producto_trd > 0) {
        precio = precio_producto_trd;
        obj["precio_" + info_pais.id_pais] = precio;
        value.precio_str = obj;
      }
      let id_seller_win = 1;
      if (!trobat2) {
        id_seller_win = 333;
      }
      html_codigo_desc = "";
      value.html_codigo_desc = html_codigo_desc;
      precio_ant = get_precio_anterior(
        precio,
        "",
        rec,
        id_seller_win,
        fecha_descatalogado,
        desc_brand,
        0
      );
      value.precio_anterior = 0;
    }
    item_print = productListInsert(contenedor, value, true, true, marcas);
    if (item_print != "") {
      item_list = item_list + item_print;
    }
  });
  return item_list;
}
function producto_valido_pack(subfamilias_pack, subfamilas_producto) {
  let list_subfam = [];
  let valido_pack = false;
  subfamilas_producto.forEach((familias) => {
    Object.values(familias).forEach((subfamilas) => {
      if (typeof subfamilas["id_subfamilia"] !== "undefined") {
        list_subfam.push(subfamilas["id_subfamilia"]);
      }
    });
  });
  subfamilias_pack.forEach((subfam_pack) => {
    if (list_subfam.includes(subfam_pack["id_subfamilia_pack"])) {
      valido_pack = true;
    }
  });
  return valido_pack;
}
function get_info_extra_product(list_products, model, marca) {
  let list_tallas = [];
  let new_list_products = [];
  let max_desc_brand = 0;
  let desc_brand = 0;
  let trobat = false;
  let seller_tradeinn = false;
  let nlp = 0;
  let lis = 0;
  while (lis < list_products.length) {
    let baja = list_products[lis]["baja"];
    if (baja == 0) {
      if (typeof list_products[lis]["sellers"] === "undefined") {
        lis++;
        continue;
      }
      if (list_products[lis]["sellers"][0] === null) {
        lis++;
        continue;
      }
      if (list_products[lis]["sellers"].length === 0) {
        lis++;
        continue;
      }
      if (typeof new_list_products[nlp] === "undefined") {
        new_list_products[nlp] = [];
      }
      new_list_products[nlp]["baja"] = list_products[lis]["baja"];
      new_list_products[nlp]["brut"] = list_products[lis]["brut"];
      new_list_products[nlp]["desc_brand"] = list_products[lis]["desc_brand"];
      new_list_products[nlp]["exist"] = list_products[lis]["exist"];
      new_list_products[nlp]["id_producte"] = list_products[lis]["id_producte"];
      new_list_products[nlp]["pmp"] = list_products[lis]["pmp"];
      new_list_products[nlp]["marca"] = marca;
      new_list_products[nlp]["model"] = model;
      new_list_products[nlp]["rec"] = list_products[lis]["rec"];
      new_list_products[nlp]["ean"] = list_products[lis]["ean"];
      new_list_products[nlp]["stock_reservat"] =
        list_products[lis]["stock_reservat"];
      new_list_products[nlp]["talla"] = list_products[lis]["talla"];
      new_list_products[nlp]["talla2"] = list_products[lis]["talla2"];
      new_list_products[nlp]["v90"] = list_products[lis]["v90"];
      new_list_products[nlp]["color"] = list_products[lis]["color"];
      if (
        info_pais["talla_code"] != "" &&
        info_pais["talla_code"] != "NOTINC"
      ) {
        new_list_products[nlp]["talla_" + info_pais["talla_code"]] =
          list_products[lis]["talla_" + info_pais["talla_code"]];
      }
      let precios_pais = [];
      if (
        typeof list_products[lis]["sellers"][0]["precios_paises"] != "undefined"
      ) {
        precios_pais = get_solo_precios_pais(list_products[lis]["sellers"]);
      }
      new_list_products[nlp]["sellers"] = precios_pais;
      nlp++;
      let talla_pais = "";
      let value_talla = "";
      if (
        info_pais["talla_code"] != "" &&
        info_pais["talla_code"] != "NOTINC"
      ) {
        if (info_pais["talla_code"] == "usa") {
          talla_pais = "us";
        } else {
          talla_pais = info_pais["talla_code"];
        }
        if (
          list_products[lis]["talla_" + talla_pais] != "" &&
          list_products[lis]["talla_" + talla_pais] != null
        ) {
          value_talla = list_products[lis]["talla_" + talla_pais];
        } else {
          value_talla = list_products[lis]["talla"];
        }
      } else {
        value_talla = list_products[lis]["talla"];
      }
      let talla_list = "";
      if (list_products[lis]["talla2"].length > 0) {
        talla_list = value_talla + "#/#" + list_products[lis]["talla2"];
      } else {
        talla_list = value_talla;
      }
      list_tallas.push(talla_list);
      desc_brand = list_products[lis]["desc_brand"];
      if (desc_brand > max_desc_brand) {
        max_desc_brand = desc_brand;
      }
      let list_sellers = list_products[lis]["sellers"];
      let ls = 0;
      while (trobat == false && ls < list_sellers.length) {
        if (list_sellers[ls]["id_seller"] == 1) {
          trobat = true;
          seller_tradeinn = true;
        }
        ls++;
      }
    }
    lis++;
  }
  let info_extra_return = [];
  info_extra_return[0] = list_tallas;
  info_extra_return[1] = max_desc_brand;
  info_extra_return[2] = seller_tradeinn;
  info_extra_return[3] = new_list_products;
  return info_extra_return;
}
function get_rec_id_producte_win(list_products, id_prod_pais_win) {
  let rec = "";
  let lis = 0;
  if (typeof id_prod_pais_win === "undefined") {
    return rec;
  }
  while (lis < list_products.length) {
    if (
      list_products[lis]["id_producte"] ==
      id_prod_pais_win[info_pais["id_pais"]]
    ) {
      rec = list_products[lis]["rec"];
    }
    lis++;
  }
  return rec;
}
function get_solo_precios_pais_listado(precios_sellers) {
  let precio_producte_pais = 0;
  precios_sellers.forEach((value) => {
    if (value["id_seller"] === 1) {
      let trobat_preu = false;
      let usp = 0;
      let precios_paises_id_pais = "";
      while (!trobat_preu && usp < value["precios_paises"].length) {
        precios_paises_id_pais = value["precios_paises"][usp]["id_pais"];
        if (precios_paises_id_pais == info_pais["id_pais"]) {
          precio_producte_pais = value["precios_paises"][usp]["precio"];
          trobat_preu = true;
        }
        usp++;
      }
    }
  });
  return precio_producte_pais;
}
async function get_solo_precios_pais(precios_sellers) {
  let precio_producte_pais = 0;
  precios_sellers.forEach((value) => {
    if (value["id_seller"] === 1) {
      let trobat_preu = false;
      let usp = 0;
      let precios_paises_id_pais = "";
      while (!trobat_preu && usp < value["precios_paises"].length) {
        precios_paises_id_pais = value["precios_paises"][usp]["id_pais"];
        if (precios_paises_id_pais == info_pais["id_pais"]) {
          precio_producte_pais = value["precios_paises"][usp]["precio"];
          trobat_preu = true;
        }
        usp++;
      }
    }
  });
  return precio_producte_pais;
}
function get_info_marca(id_marca, list_marcas) {
  let id_tienda = document.getElementById("id_tienda").value;
  let marcas = "";
  if (list_marcas == "") {
    marcas = JSON.parse(get_item_storage("marcas"));
  } else {
    marcas = list_marcas;
  }
  let info_marca = [];
  if (typeof marcas[id_marca] !== "undefined") {
    info_marca["nombre"] = marcas[id_marca]["marca"];
    let marcas_aux = marcas[id_marca]["tm"].split(",");
    info_marca["tm"] = marcas_aux[id_tienda];
  }
  return info_marca;
}
function get_marca_mostrar(marca) {
  let return_marca = marca;
  if (marca.length > 1) {
    let primer_caracter = marca[0];
    let p_caracter_upp = primer_caracter.toUpperCase();
    let segundo_caracter = marca[1];
    let s_caracter_low = segundo_caracter.toLowerCase();
    if (
      primer_caracter === p_caracter_upp &&
      segundo_caracter === s_caracter_low
    ) {
      return_marca = ucwords(marca);
    }
  }
  return return_marca;
}
function get_info_valor_atributo(
  id_atributo,
  id_atr_val,
  get_info_atr_valores
) {
  let atributos = JSON.parse(get_item_storage("atributos"));
  let info_atributo_valor = [];
  if (id_atributo != "" && typeof atributos[id_atributo] !== "undefined") {
    info_atributo_valor["id_atributo"] = id_atributo;
    info_atributo_valor["nombre_atributo"] =
      atributos[id_atributo]["nombre_atributo"];
    info_atributo_valor["operador_atributo"] =
      atributos[id_atributo]["operador"];
    info_atributo_valor["prioridad_atributo"] =
      atributos[id_atributo]["prioridad"];
    if (get_info_atr_valores) {
      info_atributo_valor["info_atributos_valor"] =
        atributos[id_atributo]["valores"];
    }
  } else {
    for (let id_atributo in atributos) {
      if (atributos.hasOwnProperty(id_atributo)) {
        let atributos_valores = atributos[id_atributo]["valores"];
        for (let key2 in atributos_valores) {
          if (key2 == id_atr_val) {
            info_atributo_valor["id_atributo"] = id_atributo;
            info_atributo_valor["nombre_atributo"] =
              atributos[id_atributo]["nombre_atributo"];
            info_atributo_valor["operador_atributo"] =
              atributos[id_atributo]["operador"];
            info_atributo_valor["prioridad_atributo"] =
              atributos[id_atributo]["prioridad"];
            info_atributo_valor["nombre_atributo_valor"] =
              atributos[id_atributo]["valores"][id_atr_val];
            return info_atributo_valor;
          }
        }
      }
    }
  }
  return info_atributo_valor;
}
function get_filtro_familia(f_familia) {
  let filtro_familia = {
    nested: {
      path: "familias",
      query: { term: { "familias.id_familia": f_familia } },
    },
  };
  return filtro_familia;
}
function get_filtro_categorias(f_categorias) {
  let filtro_categorias = {
    nested: {
      path: "familias.subfamilias",
      query: { terms: { "familias.subfamilias.id_subfamilia": [] } },
    },
  };
  let list_f_categorias = f_categorias.split(",");
  for (let i = 0; i < list_f_categorias.length; i++) {
    filtro_categorias["nested"]["query"]["terms"][
      "familias.subfamilias.id_subfamilia"
    ].push(list_f_categorias[i]);
  }
  return filtro_categorias;
}
function get_filtro_marcas(f_marcas) {
  let list_f_marcas = f_marcas.split(",");
  let valores_marcas = [];
  for (let i = 0; i < list_f_marcas.length; i++) {
    valores_marcas.push(list_f_marcas[i]);
  }
  let filtro_marca = { terms: { id_marca: valores_marcas } };
  return filtro_marca;
}
function get_filtro_dispo_pais() {
  let filtro_dispo = {
    nested: {
      path: "productes.sellers.precios_paises",
      query: { bool: { must: [] } },
    },
  };
  let aux = {
    term: { "productes.sellers.precios_paises.id_pais": info_pais["id_pais"] },
  };
  filtro_dispo["nested"]["query"]["bool"]["must"].push(aux);
  return filtro_dispo;
}
function get_filtro_tallas(f_tallas, solo_stock_tr) {
  let list_f_tallas = f_tallas.split(",");
  let valores_tallas = [];
  for (let i = 0; i < list_f_tallas.length; i++) {
    valores_tallas.push(list_f_tallas[i]);
  }
  let vtallas = { terms: { "productes.talla_filtro.keyword": valores_tallas } };
  let filtro_talla = {
    nested: { path: "productes", query: { bool: { must: [] } } },
  };
  let filtro_dispo = get_filtro_dispo_pais();
  let aux_baja = { term: { "productes.baja": "0" } };
  filtro_talla["nested"]["query"]["bool"]["must"].push(vtallas);
  filtro_talla["nested"]["query"]["bool"]["must"].push(aux_baja);
  filtro_talla["nested"]["query"]["bool"]["must"].push(filtro_dispo);
  if (solo_stock_tr == 1) {
    let aux2 = {
      script: {
        script:
          "(doc['productes.exist'].value - doc['productes.stock_reservat'].value) > 0",
      },
    };
    filtro_talla["nested"]["query"]["bool"]["must"].push(aux2);
  }
  return filtro_talla;
}
function get_filtro_tallas_pais(f_tallas, solo_stock_tr) {
  let add_talla = "";
  if (info_pais["talla_code"] != "" && info_pais["talla_code"] != "NOTINC") {
    add_talla = "_" + info_pais["talla_code"];
  }
  let list_f_tallas = f_tallas.split(",");
  let valores_tallas = [];
  for (let i = 0; i < list_f_tallas.length; i++) {
    valores_tallas.push(list_f_tallas[i]);
  }
  let vtallas = { terms: { ["productes.talla" + add_talla]: valores_tallas } };
  let filtro_talla = {
    nested: { path: "productes", query: { bool: { must: [] } } },
  };
  let aux = { term: { "productes.baja": "0" } };
  filtro_talla["nested"]["query"]["bool"]["must"].push(aux);
  filtro_talla["nested"]["query"]["bool"]["must"].push(vtallas);
  if (solo_stock_tr == 1) {
    let aux2 = {
      script: {
        script:
          "(doc['productes.exist'].value - doc['productes.stock_reservat'].value) > 0",
      },
    };
    filtro_talla["nested"]["query"]["bool"]["must"].push(aux2);
  }
  return filtro_talla;
}
function get_filtro_tallas_2(f_tallas, solo_stock_tr) {
  let list_f_tallas = f_tallas.split(",");
  let valores_tallas = [];
  for (let i = 0; i < list_f_tallas.length; i++) {
    valores_tallas.push(list_f_tallas[i]);
  }
  let vtallas = {
    terms: { "productes.talla_filtro2.keyword": valores_tallas },
  };
  let filtro_talla = {
    nested: { path: "productes", query: { bool: { must: [] } } },
  };
  let aux = { term: { "productes.baja": "0" } };
  filtro_talla["nested"]["query"]["bool"]["must"].push(aux);
  filtro_talla["nested"]["query"]["bool"]["must"].push(vtallas);
  if (solo_stock_tr == 1) {
    let aux2 = {
      script: {
        script:
          "(doc['productes.exist'].value - doc['productes.stock_reservat'].value) > 0",
      },
    };
    filtro_talla["nested"]["query"]["bool"]["must"].push(aux2);
  }
  return filtro_talla;
}
function get_filtro_atributos(array_atributos, valor_padre_exclude) {
  let filtro_atributos_return = [];
  for (let key in array_atributos) {
    if (array_atributos[key]["operador"] == 1) {
      let filtro_atributos = {
        nested: {
          path: "atributos_padre.atributos",
          query: { bool: { should: {}, minimum_should_match: 1 } },
        },
      };
      let valores_atributos = [];
      if (key != valor_padre_exclude) {
        for (
          let i = 0;
          i < array_atributos[key]["id_atr_valores"].length;
          i++
        ) {
          let un_atr_valor = array_atributos[key]["id_atr_valores"][i];
          let afegir = {
            term: {
              "atributos_padre.atributos.id_atribut_valor": un_atr_valor,
            },
          };
          valores_atributos.push(afegir);
        }
      }
      if (valores_atributos.length > 0) {
        filtro_atributos["nested"]["query"]["bool"]["should"] =
          valores_atributos;
        filtro_atributos_return.push(filtro_atributos);
      }
    } else {
      if (key != valor_padre_exclude) {
        for (
          let i = 0;
          i < array_atributos[key]["id_atr_valores"].length;
          i++
        ) {
          let un_atr_valor = array_atributos[key]["id_atr_valores"][i];
          let filtro_atributos = {
            nested: {
              path: "atributos_padre.atributos",
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        "atributos_padre.atributos.id_atribut_valor":
                          un_atr_valor,
                      },
                    },
                  ],
                },
              },
            },
          };
          filtro_atributos_return.push(filtro_atributos);
        }
      }
    }
  }
  return filtro_atributos_return;
}
function get_atributos_padres(response_atributs) {
  let result_atributos = "";
  if (
    typeof response_atributs["aggregations"]["group_by_atributos"][
      "atributos"
    ] !== "undefined"
  ) {
    result_atributos =
      response_atributs["aggregations"]["group_by_atributos"]["atributos"][
        "id_atributo"
      ]["buckets"];
  } else if (
    typeof response_atributs["aggregations"]["group_by_atributos"][
      "id_atributo"
    ]["buckets"] !== "undefined"
  ) {
    result_atributos =
      response_atributs["aggregations"]["group_by_atributos"]["id_atributo"][
        "buckets"
      ];
  }
  let array_atr = [];
  let nombre_atr = "";
  let id_atr = "";
  for (let i = 0; i < result_atributos.length; i++) {
    id_atr = result_atributos[i]["key"];
    let info_valor_atributo = get_info_valor_atributo(id_atr, "", false);
    nombre_atr = info_valor_atributo["nombre_atributo"];
    array_atr[id_atr] = nombre_atr;
  }
  return array_atr;
}
function get_aggregation_marca(
  filtro_categorias,
  filtro_tallas,
  filtro_atributos,
  filtro_tallas_pais,
  filtro_tallas_2
) {
  let aggregation_marca_sin_filtro = {
    terms: { field: "marca.keyword", size: 1e3, order: { _key: "asc" } },
    aggs: { id_marca: { terms: { field: "id_marca" } } },
  };
  let aggregation_marca = "";
  if (
    filtro_categorias != "" ||
    filtro_tallas != "" ||
    filtro_atributos != "" ||
    filtro_tallas_pais != "" ||
    filtro_tallas_2 != ""
  ) {
    aggregation_marca = {
      filter: { bool: { must: [] } },
      aggs: { marcas: {} },
    };
    aggregation_marca["aggs"]["marcas"] = aggregation_marca_sin_filtro;
    if (filtro_categorias != "") {
      aggregation_marca["filter"]["bool"]["must"].push(filtro_categorias);
    }
    if (filtro_tallas != "") {
      aggregation_marca["filter"]["bool"]["must"].push(filtro_tallas);
    }
    if (filtro_tallas_pais != "") {
      aggregation_marca["filter"]["bool"]["must"].push(filtro_tallas_pais);
    }
    if (filtro_tallas_2 != "") {
      aggregation_marca["filter"]["bool"]["must"].push(filtro_tallas_2);
    }
    if (filtro_atributos != "") {
      filtro_atributos.forEach((value) => {
        aggregation_marca["filter"]["bool"]["must"].push(value);
      });
    }
  } else {
    aggregation_marca = aggregation_marca_sin_filtro;
  }
  return aggregation_marca;
}
function get_aggregation_categorias(
  filtro_marcas,
  filtro_tallas,
  filtro_atributos,
  filtro_tallas_pais,
  filtro_tallas_2,
  filtro_familia
) {
  let term_add = {
    subfamilias: {
      nested: { path: "familias.subfamilias" },
      aggs: {
        id_subfamilia: {
          terms: { field: "familias.subfamilias.id_subfamilia", size: 1e3 },
        },
      },
    },
  };
  let aggregation_categorias_sin_filtros = "";
  if (filtro_familia != "") {
    aggregation_categorias_sin_filtros = {
      nested: { path: "familias" },
      aggs: {
        filter_id_familia: {
          filter: { term: { "familias.id_familia": filtro_familia } },
          aggs: {},
        },
      },
    };
    aggregation_categorias_sin_filtros["aggs"]["filter_id_familia"]["aggs"] =
      term_add;
  } else {
    aggregation_categorias_sin_filtros = {
      nested: { path: "familias" },
      aggs: {},
    };
    aggregation_categorias_sin_filtros["aggs"] = term_add;
  }
  let aggregation_categorias = "";
  if (
    filtro_marcas != "" ||
    filtro_tallas != "" ||
    filtro_atributos != "" ||
    filtro_tallas_pais != "" ||
    filtro_tallas_2 != ""
  ) {
    aggregation_categorias = {
      filter: { bool: { must: [] } },
      aggs: { categorias: {} },
    };
    aggregation_categorias["aggs"]["categorias"] =
      aggregation_categorias_sin_filtros;
    if (filtro_marcas != "") {
      aggregation_categorias["filter"]["bool"]["must"].push(filtro_marcas);
    }
    if (filtro_tallas != "") {
      aggregation_categorias["filter"]["bool"]["must"].push(filtro_tallas);
    }
    if (filtro_tallas_pais != "") {
      aggregation_categorias["filter"]["bool"]["must"].push(filtro_tallas_pais);
    }
    if (filtro_tallas_2 != "") {
      aggregation_categorias["filter"]["bool"]["must"].push(filtro_tallas_2);
    }
    if (filtro_atributos != "") {
      filtro_atributos.forEach((value) => {
        aggregation_categorias["filter"]["bool"]["must"].push(value);
      });
    }
  } else {
    aggregation_categorias = aggregation_categorias_sin_filtros;
  }
  return aggregation_categorias;
}
function get_aggregation_tallas(
  filtro_categorias,
  filtro_marcas,
  filtro_atributos,
  filtro_tallas_2
) {
  let aggregation_tallas_sin_filtro = {
    nested: { path: "productes" },
    aggs: {
      talla_filter: {
        filter: { term: { "productes.baja": "0" } },
        aggs: {
          talla: {
            terms: {
              field: "productes.talla_filtro.keyword",
              order: { _key: "asc" },
              size: 1e3,
            },
          },
        },
      },
    },
  };
  let aggregation_tallas = "";
  if (
    filtro_categorias != "" ||
    filtro_marcas != "" ||
    filtro_atributos != "" ||
    filtro_tallas_2 != ""
  ) {
    aggregation_tallas = {
      filter: { bool: { must: [] } },
      aggs: { tallas: {} },
    };
    aggregation_tallas["aggs"]["tallas"] = aggregation_tallas_sin_filtro;
    if (filtro_categorias != "") {
      aggregation_tallas["filter"]["bool"]["must"].push(filtro_categorias);
    }
    if (filtro_marcas != "") {
      aggregation_tallas["filter"]["bool"]["must"].push(filtro_marcas);
    }
    if (filtro_tallas_2 != "") {
      aggregation_tallas["filter"]["bool"]["must"].push(filtro_tallas_2);
    }
    if (filtro_atributos != "") {
      filtro_atributos.forEach((value) => {
        aggregation_tallas["filter"]["bool"]["must"].push(value);
      });
    }
  } else {
    aggregation_tallas = aggregation_tallas_sin_filtro;
  }
  return aggregation_tallas;
}
function get_aggregation_tallas_pais(
  filtro_categorias,
  filtro_marcas,
  filtro_atributos,
  filtro_tallas_2
) {
  let aggregation_tallas_sin_filtro = [];
  let aggregation_tallas = "";
  let talla_code = info_pais["talla_code"];
  if (talla_code != "" && talla_code != "NOTINC") {
    let add_talla = "_" + talla_code;
    let aggregation_tallas_sin_filtro = {
      nested: { path: "productes" },
      aggs: {
        talla_filter: {
          filter: { term: { "productes.baja": "0" } },
          aggs: {
            talla: {
              terms: {
                field: "productes.talla" + add_talla,
                order: { _key: "asc" },
                size: 1e3,
              },
            },
          },
        },
      },
    };
    if (
      filtro_categorias != "" ||
      filtro_marcas != "" ||
      filtro_atributos != "" ||
      filtro_tallas_2 != ""
    ) {
      aggregation_tallas = { filter: { bool: { must: [] } }, aggs: {} };
      aggregation_tallas["aggs"]["tallas_pais"] = aggregation_tallas_sin_filtro;
      if (filtro_categorias != "") {
        aggregation_tallas["filter"]["bool"]["must"].push(filtro_categorias);
      }
      if (filtro_marcas != "") {
        aggregation_tallas["filter"]["bool"]["must"].push(filtro_marcas);
      }
      if (filtro_tallas_2 != "") {
        aggregation_tallas["filter"]["bool"]["must"].push(filtro_tallas_2);
      }
      if (filtro_atributos != "") {
        filtro_atributos.forEach((value) => {
          aggregation_tallas["filter"]["bool"]["must"].push(value);
        });
      }
    } else {
      aggregation_tallas = aggregation_tallas_sin_filtro;
    }
  } else {
    aggregation_tallas = aggregation_tallas_sin_filtro;
  }
  return aggregation_tallas;
}
function get_aggregation_tallas_2(
  filtro_categorias,
  filtro_marcas,
  filtro_atributos,
  filtro_tallas,
  filtro_tallas_pais
) {
  let aggregation_tallas_sin_filtro = {
    nested: { path: "productes" },
    aggs: {
      talla_filter: {
        filter: { term: { "productes.baja": "0" } },
        aggs: {
          talla: {
            terms: {
              field: "productes.talla_filtro2.keyword",
              order: { _key: "asc" },
              size: 1e3,
            },
          },
        },
      },
    },
  };
  let aggregation_tallas = "";
  if (
    filtro_categorias != "" ||
    filtro_marcas != "" ||
    filtro_atributos != "" ||
    filtro_tallas != "" ||
    filtro_tallas_pais != ""
  ) {
    aggregation_tallas = {
      filter: { bool: { must: [] } },
      aggs: { tallas: {} },
    };
    aggregation_tallas["aggs"]["tallas"] = aggregation_tallas_sin_filtro;
    if (filtro_categorias != "") {
      aggregation_tallas["filter"]["bool"]["must"].push(filtro_categorias);
    }
    if (filtro_marcas != "") {
      aggregation_tallas["filter"]["bool"]["must"].push(filtro_marcas);
    }
    if (filtro_tallas != "") {
      aggregation_tallas["filter"]["bool"]["must"].push(filtro_tallas);
    }
    if (filtro_tallas_pais != "") {
      aggregation_tallas["filter"]["bool"]["must"].push(filtro_tallas_pais);
    }
    if (filtro_atributos != "") {
      filtro_atributos.forEach((value) => {
        aggregation_tallas["filter"]["bool"]["must"].push(value);
      });
    }
  } else {
    aggregation_tallas = aggregation_tallas_sin_filtro;
  }
  return aggregation_tallas;
}
function get_aggregation_atributos(
  filtro_categorias,
  filtro_marcas,
  filtro_tallas,
  filtro_tallas_pais,
  filtro_tallas_2
) {
  let aggregation_atributos_sin_filtros = {
    nested: { path: "atributos_padre" },
    aggs: {
      id_atributo: {
        terms: { field: "atributos_padre.id_atribut_pare", size: 1e3 },
        aggs: {
          valor_atributos: {
            nested: { path: "atributos_padre.atributos" },
            aggs: {
              ids_atributos_valor: {
                terms: {
                  field: "atributos_padre.atributos.id_atribut_valor",
                  size: 1e3,
                },
              },
            },
          },
        },
      },
    },
  };
  let aggregation_atributos = "";
  if (
    filtro_categorias != "" ||
    filtro_marcas != "" ||
    filtro_tallas != "" ||
    filtro_tallas_pais != "" ||
    filtro_tallas_2 != ""
  ) {
    aggregation_atributos = {
      filter: { bool: { must: [] } },
      aggs: { atributos: {} },
    };
    aggregation_atributos["aggs"]["atributos"] =
      aggregation_atributos_sin_filtros;
    if (filtro_categorias != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_categorias);
    }
    if (filtro_marcas != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_marcas);
    }
    if (filtro_tallas != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_tallas);
    }
    if (filtro_tallas_pais != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_tallas_pais);
    }
    if (filtro_tallas_2 != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_tallas_2);
    }
  } else {
    aggregation_atributos = aggregation_atributos_sin_filtros;
  }
  return aggregation_atributos;
}
function get_aggregation_atributos_padre(
  filtro_categorias,
  filtro_marcas,
  filtro_tallas,
  filtro_tallas_pais,
  filtro_tallas_2,
  filtro_familia
) {
  let aggregation_atributos_sin_filtros = {
    nested: { path: "atributos_padre" },
    aggs: {
      id_atributo: {
        terms: { field: "atributos_padre.id_atribut_pare", size: "1000" },
      },
    },
  };
  let aggregation_atributos = "";
  if (
    filtro_categorias != "" ||
    filtro_marcas != "" ||
    filtro_tallas != "" ||
    filtro_tallas_pais != "" ||
    filtro_tallas_2 != "" ||
    filtro_familia != ""
  ) {
    aggregation_atributos = {
      filter: { bool: { must: [] } },
      aggs: { atributos: [] },
    };
    aggregation_atributos["aggs"]["atributos"] =
      aggregation_atributos_sin_filtros;
    if (filtro_familia != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_familia);
    }
    if (filtro_categorias != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_categorias);
    }
    if (filtro_marcas != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_marcas);
    }
    if (filtro_tallas != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_tallas);
    }
    if (filtro_tallas_pais != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_tallas_pais);
    }
    if (filtro_tallas_2 != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_tallas_2);
    }
  } else {
    aggregation_atributos = aggregation_atributos_sin_filtros;
  }
  return aggregation_atributos;
}
function get_aggregation_atributos_valores(
  id_atributo,
  array_filtro_atributos,
  filtro_categorias,
  filtro_marcas,
  filtro_tallas,
  filtro_tallas_pais,
  filtro_tallas_2
) {
  let aggregation_atributos_sin_filtros = {
    nested: { path: "atributos_padre" },
    aggs: {
      id_atribut_valor: {
        terms: {
          field: "atributos_padre.id_atribut_pare.keyword",
          include: id_atributo,
          order: { _key: "asc" },
          size: 1e3,
        },
        aggs: {
          atributos: {
            nested: { path: "atributos_padre.atributos" },
            aggs: {
              id_atribut_valor: {
                terms: { field: "atributos_padre.atributos.id_atribut_valor" },
              },
            },
          },
        },
      },
    },
  };
  let filtro_atributos = get_filtro_atributos(
    array_filtro_atributos,
    id_atributo
  );
  let aggregation_atributos = "";
  if (
    filtro_categorias != "" ||
    filtro_marcas != "" ||
    filtro_tallas != "" ||
    filtro_atributos != "" ||
    filtro_tallas_pais != "" ||
    filtro_tallas_2 != ""
  ) {
    aggregation_atributos = {
      filter: { bool: { must: [] } },
      aggs: { atributos: {} },
    };
    aggregation_atributos["aggs"]["atributos"] =
      aggregation_atributos_sin_filtros;
    if (filtro_categorias != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_categorias);
    }
    if (filtro_marcas != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_marcas);
    }
    if (filtro_tallas != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_tallas);
    }
    if (filtro_tallas_pais != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_tallas_pais);
    }
    if (filtro_tallas_2 != "") {
      aggregation_atributos["filter"]["bool"]["must"].push(filtro_tallas_2);
    }
    if (filtro_atributos != "") {
      filtro_atributos.forEach((value) => {
        aggregation_atributos["filter"]["bool"]["must"].push(value);
      });
    }
  } else {
    aggregation_atributos = aggregation_atributos_sin_filtros;
  }
  return aggregation_atributos;
}
function actualizar_filtros(data) {
  let url_search = document.getElementById("url_search").value;
  let filtros_sel = document.getElementById("filtros_sel").value;
  let id_tienda = document.getElementById("id_tienda").value;
  let cant_marcas = 0;
  let cant_tallas = 0;
  let cant_tallas2 = 0;
  let abuscar = "";
  let id_campana_aux = "";
  let cat_sel = false;
  if (typeof data === "undefined") {
    return;
  }
  let group_by_categorias = [];
  if (typeof data.group_by_categorias.categorias !== "undefined") {
    if (
      typeof data.group_by_categorias.categorias.filter_id_familia !==
      "undefined"
    ) {
      group_by_categorias =
        data.group_by_categorias.categorias.filter_id_familia.subfamilias
          .id_subfamilia.buckets;
    } else {
      group_by_categorias =
        data.group_by_categorias.categorias.subfamilias.id_subfamilia.buckets;
    }
  } else {
    if (typeof data.group_by_categorias.filter_id_familia !== "undefined") {
      group_by_categorias =
        data.group_by_categorias.filter_id_familia.subfamilias.id_subfamilia
          .buckets;
    } else {
      group_by_categorias =
        data.group_by_categorias.subfamilias.id_subfamilia.buckets;
    }
  }
  let group_by_marcas = [];
  if (typeof data.group_by_marca.marcas !== "undefined") {
    group_by_marcas = data.group_by_marca.marcas.buckets;
  } else {
    group_by_marcas = data.group_by_marca.buckets;
  }
  let group_by_tallas = [];
  if (typeof data.group_by_tallas.tallas !== "undefined") {
    group_by_tallas = data.group_by_tallas.tallas.talla_filter.talla.buckets;
  } else {
    group_by_tallas = data.group_by_tallas.talla_filter.talla.buckets;
  }
  let group_by_tallas_pais = [];
  if (typeof data.group_by_tallas_pais !== "undefined") {
    if (typeof data.group_by_tallas_pais.tallas_pais !== "undefined") {
      group_by_tallas_pais =
        data.group_by_tallas_pais.tallas_pais.talla_filter.talla.buckets;
    } else {
      group_by_tallas_pais =
        data.group_by_tallas_pais.talla_filter.talla.buckets;
    }
  }
  let group_by_tallas2 = [];
  if (typeof data.group_by_tallas_2.tallas !== "undefined") {
    group_by_tallas2 = data.group_by_tallas_2.tallas.talla_filter.talla.buckets;
  } else {
    group_by_tallas2 = data.group_by_tallas_2.talla_filter.talla.buckets;
  }
  let group_by_atributos = [];
  if (typeof data.group_by_atributos !== "undefined") {
    if (typeof data.group_by_atributos.atributos !== "undefined") {
      group_by_atributos = get_group_by_atributos(
        data.group_by_atributos.atributos.id_atributo.buckets,
        0
      );
    } else {
      group_by_atributos = get_group_by_atributos(
        data.group_by_atributos.id_atributo.buckets,
        0
      );
    }
  } else {
    group_by_atributos = get_group_by_atributos(data, 1);
  }
  multiSort(group_by_atributos, { prioridad: "asc" });
  let text_check_superior = "";
  let mostrar_talla = true;
  let num_cat_sel = 0;
  let text = "";
  let text_check = "";
  let text_check_c = "";
  let list_atr_permitidos = "";
  if (group_by_categorias.length > 0) {
    let seleccionados = ",";
    let list_sel = filtros_sel.split("#");
    let fl = "";
    let id = "";
    let nombre = "";
    for (let i = 1; i < list_sel.length; i++) {
      fl = list_sel[i].charAt(0);
      if (fl == "c") {
        let fr = list_sel[i].slice(1, list_sel[i].length);
        let list_item = fr.split("@");
        id = list_item[0];
        nombre = list_item[1];
        num_cat_sel++;
        seleccionados = seleccionados + id + ",";
        let info_subfamilia = get_info_subfamilia(id, false);
        nombre = info_subfamilia["nombre_subfamilia"];
        list_atr_permitidos += info_subfamilia["list_atr"] + ",";
        text_check = "";
        text_check_c = text_check_c + "<li class='input-checkbox'>";
        text_check_c =
          text_check_c + "<div class='listado-checkbox-container'>";
        text_check =
          text_check +
          "<input type='checkbox' checked id='categorias_" +
          id +
          '\' onclick=\'javascript:modificar_filtros("categorias","' +
          id +
          "\",this)'/>";
        text_check =
          text_check +
          "<label for='categorias_" +
          id +
          "' class='txt-base'>" +
          nombre +
          "</label>";
        text_check_c = text_check_c + text_check;
        text_check_c = text_check_c + "</div>";
        text_check_c = text_check_c + "</li>";
        text_check_superior =
          text_check_superior +
          "<div class='filters-top__active'>" +
          text_check +
          "</div>";
      }
    }
    var array_categories = [];
    var copy_talla = "";
    var copy_talla2 = "";
    var tallas_visible = 1;
    for (let i = 0; i < group_by_categorias.length; i++) {
      let obj = group_by_categorias[i];
      let idsubfamilia = obj["key"];
      let num_prods_subfamilia = obj["doc_count"];
      let info_subfamilia = get_info_subfamilia(idsubfamilia, false);
      if (typeof info_subfamilia["nombre_subfamilia"] === "undefined") {
        continue;
      }
      let nom_subfamilia = info_subfamilia["nombre_subfamilia"];
      if (array_categories.indexOf(nom_subfamilia) === -1) {
        array_categories.push(nom_subfamilia);
        abuscar = "," + idsubfamilia + ",";
        if (seleccionados.indexOf(abuscar) !== -1) {
          if (num_cat_sel == 1) {
            copy_talla = info_subfamilia["copy_talla"];
            copy_talla2 = info_subfamilia["copy_talla2"];
            tallas_visible = info_subfamilia["tallas_visible"];
          }
        } else {
          text = text + "<li class='input-checkbox'>";
          text = text + "<div class='listado-checkbox-container'>";
          text =
            text +
            "<input type='checkbox' id='categorias_" +
            idsubfamilia +
            '\' onclick=\'javascript:modificar_filtros("categorias","' +
            idsubfamilia +
            "\",this)'>";
          text =
            text +
            "<label for='categorias_" +
            idsubfamilia +
            "' class='txt-base'>" +
            nom_subfamilia +
            "</label>";
          text =
            text +
            "<span class='listado-result-number'> " +
            num_prods_subfamilia +
            "</span>";
          text = text + "</div>";
          text = text + "</li>";
        }
      }
    }
    if (num_cat_sel == 1) {
      if (tallas_visible == 0) {
        let te_talla1 = "#t1";
        if (filtros_sel.indexOf(te_talla1) !== -1) {
        } else {
          mostrar_talla = false;
          document
            .getElementById("js-list_tallas")
            .classList.add("-novisibility");
          document
            .getElementById("js-list_tallas2")
            .classList.add("-novisibility");
        }
      } else {
        if (copy_talla != "" && copy_talla !== null) {
          document.getElementById("js-copy_tallas").innerHTML = copy_talla;
        }
        if (copy_talla2 != "" && copy_talla2 !== null) {
          document.getElementById("js-copy_tallas2").innerHTML = copy_talla2;
        }
      }
    } else {
      document.getElementById("js-copy_tallas").innerHTML =
        get_var_storage("tallas");
      document.getElementById("js-list_tallas2").classList.add("-novisibility");
    }
    document.getElementById("js-categorias").innerHTML = text_check_c + text;
    if (
      document
        .getElementById("js-list_categorias")
        .classList.contains("-novisibility")
    ) {
      document
        .getElementById("js-list_categorias")
        .classList.remove("-novisibility");
    }
  } else {
    document
      .getElementById("js-list_categorias")
      .classList.add("-novisibility");
    document.getElementById("js-list_tallas").classList.add("-novisibility");
  }
  let array_marca_total = [];
  let array_marcas_top_total = [];
  let list_marcas = JSON.parse(get_item_storage("marcas"));
  let info_marca = "";
  for (let i = 0; i < group_by_marcas.length; i++) {
    let objmarca = group_by_marcas[i];
    let nombre = objmarca["key"];
    let num_prods_marca = objmarca["doc_count"];
    let id_marca = objmarca.id_marca.buckets[0]["key"];
    let array_marca = [];
    array_marca.push(nombre);
    array_marca.push(num_prods_marca);
    array_marca.push(id_marca);
    info_marca = get_info_marca(id_marca, list_marcas);
    if (typeof info_marca["nombre"] !== "undefined") {
      array_marca.push(parseInt(info_marca["tm"]));
      array_marca_total.push(array_marca);
      array_marcas_top_total.push(array_marca);
    }
  }
  array_marcas_top_total.sort(function (a, b) {
    return a[3] - b[3];
  });
  array_marca_total.sort(function (array_marca_total, b) {
    return array_marca_total[0].toLowerCase().localeCompare(b[0].toLowerCase());
  });
  if (array_marca_total.length > 0) {
    text = "";
    text_check_c = "";
    let item = "";
    let seleccionados_marca = ",";
    let list_sel = filtros_sel.split("#");
    for (let i = 1; i < list_sel.length; i++) {
      let fl = list_sel[i].charAt(0);
      if (fl == "m") {
        let id = list_sel[i].slice(1, list_sel[i].length);
        info_marca = get_info_marca(id, list_marcas);
        if (typeof info_marca["nombre"] !== "undefined") {
          let nombre = info_marca["nombre"];
          let nombre_visual = get_marca_mostrar(nombre);
          seleccionados_marca = seleccionados_marca + id + ",";
          text_check = "";
          text_check_c = text_check_c + "<li class='input-checkbox'>";
          text_check_c =
            text_check_c + "<div class='listado-checkbox-container'>";
          text_check =
            text_check +
            "<input type='checkbox' checked id='marcas_" +
            id +
            '\' onclick=\'javascript:modificar_filtros("marcas","' +
            id +
            "\",this)'>";
          text_check =
            text_check +
            "<label for='marcas_" +
            id +
            "' class='txt-base'>" +
            nombre_visual +
            "</label>";
          text_check_c = text_check_c + text_check;
          text_check_c = text_check_c + "</div>";
          text_check_c = text_check_c + "</li>";
          text_check_superior =
            text_check_superior +
            "<div class='filters-top__active'>" +
            text_check +
            "</div>";
        }
      }
    }
    text = "<div id='js-marcas_top' class='listado-ul'>";
    let fi_marcas_top = 25;
    if (array_marcas_top_total.length < 12) {
      fi_marcas_top = array_marcas_top_total.length;
      document
        .getElementById("js-marcas_ver_mas_menos")
        .classList.add("-novisibility");
      document
        .getElementById("js-marcas_ver_mas_menos")
        .classList.remove("-visibility");
    } else {
      document
        .getElementById("js-marcas_ver_mas_menos")
        .classList.add("-visibility");
      document
        .getElementById("js-marcas_ver_mas_menos")
        .classList.remove("-novisibility");
    }
    for (let i = 0; i < fi_marcas_top; i++) {
      item = array_marcas_top_total[i];
      if (typeof item === "undefined") {
        break;
      }
      let nombre = item[0];
      let num_resultats = item[1];
      let id_marca = item[2];
      let nombre_visual = get_marca_mostrar(nombre);
      abuscar = "," + id_marca + ",";
      if (seleccionados_marca.indexOf(abuscar) !== -1) {
      } else {
        text = text + "<li class='input-checkbox'>";
        text = text + "<div class='listado-checkbox-container'>";
        text =
          text +
          "<input type='checkbox' id='top_marcas_" +
          id_marca +
          '\' onclick=\'javascript:modificar_filtros("marcas","' +
          id_marca +
          "\",this)'>";
        text =
          text +
          "<label for='top_marcas_" +
          id_marca +
          "' class='txt-base'>" +
          nombre_visual +
          "</label>";
        text =
          text +
          "<span class='listado-result-number'> " +
          num_resultats +
          "</span>";
        text = text + "</div>";
        text = text + "</li>";
        cant_marcas++;
      }
    }
    text = text + "</div>";
    text =
      text + "<div id='js-marcas_alfabetic' class='-novisibility listado-ul'>";
    for (let i = 0; i < array_marca_total.length; i++) {
      item = array_marca_total[i];
      let nombre = item[0];
      let num_resultats = item[1];
      let id_marca = item[2];
      let nombre_visual = get_marca_mostrar(nombre);
      abuscar = "," + id_marca + ",";
      if (seleccionados_marca.indexOf(abuscar) !== -1) {
      } else {
        text = text + "<li class='input-checkbox'>";
        text = text + "<div class='listado-checkbox-container'>";
        text =
          text +
          "<input type='checkbox' id='marcas_" +
          id_marca +
          '\' onclick=\'javascript:modificar_filtros("marcas","' +
          id_marca +
          "\",this)'>";
        text =
          text +
          "<label for='marcas_" +
          id_marca +
          "' class='txt-base'>" +
          nombre_visual +
          "</label>";
        text =
          text +
          "<span class='listado-result-number'> " +
          num_resultats +
          "</span>";
        text = text + "</div>";
        text = text + "</li>";
        cant_marcas++;
      }
    }
    text = text + "</div>";
    document.getElementById("js-marcas").innerHTML = text_check_c + text;
    if (
      document
        .getElementById("js-list_marcas")
        .classList.contains("-novisibility")
    ) {
      document
        .getElementById("js-list_marcas")
        .classList.remove("-novisibility");
    }
  } else {
    document.getElementById("js-list_marcas").classList.add("-novisibility");
  }
  let add_class = "";
  if (mostrar_talla) {
    if (group_by_tallas_pais.length > 0 || group_by_tallas.length > 0) {
      text = "";
      text_check_c = "";
      if (group_by_tallas_pais.length > 0) {
        let list_sel = filtros_sel.split("#");
        for (let i = 1; i < list_sel.length; i++) {
          let fl = list_sel[i].slice(0, 6);
          if (fl == "tlocal") {
            let fr = list_sel[i].slice(6, list_sel[i].length);
            let list_item = fr.split("@");
            let id = list_item[0];
            let nombre = list_item[1];
            text_check = "";
            text_check_c = text_check_c + "<li class='input-checkbox'>";
            text_check_c =
              text_check_c + "<div class='listado-checkbox-container'>";
            text_check =
              text_check +
              "<input type='checkbox' checked id='tallas_" +
              id +
              "' onclick='javascript:modificar_filtros(\"tallas_" +
              info_pais["talla_code"] +
              '","' +
              id +
              "\",this)'>";
            text_check =
              text_check +
              "<label for='tallas_" +
              id +
              "' class='txt-base'>" +
              nombre +
              "</label>";
            text_check_c = text_check_c + text_check;
            text_check_c = text_check_c + "</div>";
            text_check_c = text_check_c + "</li>";
            text_check_superior =
              text_check_superior +
              "<div class='filters-top__active'>" +
              text_check +
              "</div>";
          }
        }
        for (let i = 0; i < group_by_tallas_pais.length; i++) {
          if (group_by_tallas_pais[i]["key"] != "") {
            let nombre_talla = group_by_tallas_pais[i]["key"];
            let num_resultats = group_by_tallas_pais[i]["doc_count"];
            abuscar = "tlocal" + nombre_talla + "@";
            if (filtros_sel.indexOf(abuscar) !== -1) {
            } else {
              if (nombre_talla != "") {
                cant_tallas++;
                var item_mostrar = "";
                if (!isNaN(nombre_talla)) {
                  var talla_a_concatenar = info_pais["talla_code"];
                  if (talla_a_concatenar == "usa") talla_a_concatenar = "us";
                  item_mostrar =
                    talla_a_concatenar.toUpperCase() + " " + nombre_talla;
                } else item_mostrar = nombre_talla;
                if (cant_tallas >= 12) add_class = "no_li_tallas -novisibility";
                text = text + "<li class='input-checkbox " + add_class + "'>";
                text = text + "<div class='listado-checkbox-container'>";
                text =
                  text +
                  "<input type='checkbox' id='tallas_" +
                  nombre_talla +
                  "' onclick='javascript:modificar_filtros(\"tallas_" +
                  info_pais["talla_code"] +
                  '","' +
                  nombre_talla +
                  "\",this)'>";
                text =
                  text +
                  "<label for='tallas_" +
                  nombre_talla +
                  "' class='txt-base'>" +
                  item_mostrar +
                  "</label>";
                text =
                  text +
                  "<span class='listado-result-number'> " +
                  num_resultats +
                  "</span>";
                text = text + "</div>";
                text = text + "</li>";
              }
            }
          }
        }
      }
      let list_sel = filtros_sel.split("#");
      for (let i = 1; i < list_sel.length; i++) {
        let fl = list_sel[i].slice(0, 2);
        if (fl == "t1") {
          let fr = list_sel[i].slice(1, list_sel[i].length);
          let list_item = fr.split("@");
          let id = list_item[0];
          let nombre = list_item[1];
          text_check = "";
          text_check_c = text_check_c + "<li class='input-checkbox'>";
          text_check_c =
            text_check_c + "<div class='listado-checkbox-container'>";
          text_check =
            text_check +
            "<input type='checkbox' checked id='tallas_" +
            nombre +
            '\' onclick=\'javascript:modificar_filtros("tallas","' +
            nombre +
            "\",this)'>";
          text_check =
            text_check +
            "<label for='tallas_" +
            nombre +
            "' class='txt-base'>" +
            nombre +
            "</label>";
          text_check_c = text_check_c + text_check;
          text_check_c = text_check_c + "</div>";
          text_check_c = text_check_c + "</li>";
          text_check_superior =
            text_check_superior +
            "<div class='filters-top__active'>" +
            text_check +
            "</div>";
        }
      }
      for (let i = 0; i < group_by_tallas.length; i++) {
        let nombre_talla = group_by_tallas[i]["key"];
        let num_resultats = group_by_tallas[i]["doc_count"];
        abuscar = "t1" + nombre_talla + "@";
        if (filtros_sel.indexOf(abuscar) !== -1) {
        } else {
          if (nombre_talla != "") {
            cant_tallas++;
            if (cant_tallas >= 12) add_class = "no_li_tallas -novisibility";
            text = text + "<li class='input-checkbox " + add_class + "'>";
            text = text + "<div class='listado-checkbox-container'>";
            text =
              text +
              "<input type='checkbox' id='tallas_" +
              nombre_talla +
              '\' onclick=\'javascript:modificar_filtros("tallas","' +
              nombre_talla +
              "\",this)'>";
            text =
              text +
              "<label for='tallas_" +
              nombre_talla +
              "' class='txt-base'>" +
              nombre_talla +
              "</label>";
            text =
              text +
              "<span class='listado-result-number'> " +
              num_resultats +
              "</span>";
            text = text + "</div>";
            text = text + "</li>";
          }
        }
      }
      document.getElementById("js-tallas").innerHTML = text_check_c + text;
      if (
        document
          .getElementById("js-list_tallas")
          .classList.contains("-novisibility")
      ) {
        document
          .getElementById("js-list_tallas")
          .classList.remove("-novisibility");
      }
    } else {
      document.getElementById("js-list_tallas").classList.add("-novisibility");
    }
    if (cant_tallas < 12) {
      document
        .getElementById("js-tallas_ver_mas_menos")
        .classList.add("-novisibility");
      document
        .getElementById("js-tallas_ver_mas_menos")
        .classList.remove("-visibility");
    } else {
      document
        .getElementById("js-tallas_ver_mas_menos")
        .classList.add("-visibility");
      document
        .getElementById("js-tallas_ver_mas_menos")
        .classList.remove("-novisibility");
    }
  }
  let text2 = "";
  let text_check2 = "";
  let text_check2_c = "";
  if (
    group_by_tallas2.length == 0 ||
    (group_by_tallas2.length == 1 && group_by_tallas2[0]["key"] == "")
  ) {
    document.getElementById("js-list_tallas2").classList.add("-novisibility");
  } else if (num_cat_sel == 1) {
    let list_sel = filtros_sel.split("#");
    for (let i = 1; i < list_sel.length; i++) {
      let fl = list_sel[i].slice(0, 2);
      if (fl == "t2") {
        let fr = list_sel[i].slice(1, list_sel[i].length);
        let list_item = fr.split("@");
        let id = list_item[0];
        let nombre = list_item[1];
        text_check2 = "";
        text_check2_c = text_check2_c + "<li class='input-checkbox'>";
        text_check2_c =
          text_check2_c + "<div class='listado-checkbox-container'>";
        text_check2 =
          text_check2 +
          "<input type='checkbox' checked id='tallas2_" +
          id +
          '\' onclick=\'javascript:modificar_filtros("tallas2","' +
          nombre +
          "\",this)'>";
        text_check2 =
          text_check2 +
          "<label for='tallas2_" +
          id +
          "' class='txt-base'>" +
          nombre +
          "</label>";
        text_check2_c = text_check2_c + text_check2;
        text_check2_c = text_check2_c + "</div>";
        text_check2_c = text_check2_c + "</li>";
        text_check_superior =
          text_check_superior +
          "<div class='filters-top__active'>" +
          text_check2 +
          "</div>";
      }
    }
    for (let i = 0; i < group_by_tallas2.length; i++) {
      let nombre_talla2 = group_by_tallas2[i]["key"];
      let num_resultats2 = group_by_tallas2[i]["doc_count"];
      if (nombre_talla2 != "") {
        let val = nombre_talla2.split("+").join("%2B");
        val = val.split("&").join("%26");
        abuscar = "t2" + val + "@";
        if (filtros_sel.indexOf(abuscar) !== -1) {
        } else {
          cant_tallas2++;
          text2 = text2 + "<li class='input-checkbox'>";
          text2 = text2 + "<div class='listado-checkbox-container'>";
          text2 =
            text2 +
            "<input type='checkbox' id='tallas2_" +
            nombre_talla2 +
            '\' onclick=\'javascript:modificar_filtros("tallas2","' +
            nombre_talla2 +
            "\",this)'>";
          text2 =
            text2 +
            "<label for='tallas2_" +
            nombre_talla2 +
            "' class='txt-base'>" +
            nombre_talla2 +
            "</label>";
          text2 =
            text2 +
            "<span class='listado-result-number'> " +
            num_resultats2 +
            "</span>";
          text2 = text2 + "</div>";
          text2 = text2 + "</li>";
        }
      }
    }
    if (text_check2 != "" || text2 != "") {
      document.getElementById("js-list_tallas2").classList.add("-visibility");
      document
        .getElementById("js-list_tallas2")
        .classList.remove("-novisibility");
      document.getElementById("js-tallas2").innerHTML = text_check2_c + text2;
    }
  } else {
    document.getElementById("js-list_tallas2").classList.add("-novisibility");
    document.getElementById("js-list_tallas2").classList.remove("-visibility");
  }
  if (group_by_atributos.length > 0) {
    let text_check_s = mostrar_desplegable_dinamicos(
      group_by_atributos,
      list_atr_permitidos
    );
    text_check_superior = text_check_superior + text_check_s;
  }
  document.getElementById("js-filtros_seleccionados").innerHTML =
    text_check_superior;
  if (id_tienda == 9) {
    var pathname = window.location.pathname;
    var res = pathname.split("/");
    id_campana_aux = res[res.length - 2].trim();
    if (id_campana_aux == 149) {
      let list_sel_comprovar = filtros_sel.split("#");
      if (list_sel_comprovar.length > 1) {
        cat_sel = true;
      }
    }
    if (id_campana_aux == 149 && cat_sel == false) {
      document.getElementById("js-list_marcas").classList.add("-novisibility");
      document.getElementById("js-list_tallas").classList.add("-novisibility");
    }
  }
  let list_stock = url_search.split("exist=");
  let ip_cookie = getCookie("ip");
  let cliente_tienda = getCookie("cliente_tienda");
  if (array_ips_celra.indexOf(ip_cookie) >= 0 || cliente_tienda == 1) {
    let check_celra = "";
    text = "";
    if (list_stock.length > 1) {
      check_celra = "checked";
    }
    text = text + "<div class='listado-title-wrapper'>";
    text = text + "<p class='txt-base__bold'>Stock</p>";
    text = text + "</div>";
    text = text + "<ul class='listado-ul'>";
    text = text + "<li class='input-checkbox'>";
    text = text + "<div class='listado-checkbox-container'>";
    text =
      text +
      "<input type='checkbox' " +
      check_celra +
      " id='stock_celra' onclick='javascript:modificar_filtros(\"stock\",\"celra\",this)'>";
    text =
      text +
      "<label for='stock_celra' class='txt-base'>Productos con Stock</label>";
    text = text + "</div>";
    text = text + "</li>";
    text = text + "</ul>";
    document.getElementById("js-list_stock").innerHTML = text;
    if (array_ips_celra.indexOf(ip_cookie) >= 0) {
      let check_seller = "";
      text = "";
      let list_seller = url_search.split("solo_seller=");
      if (list_seller.length > 1) {
        check_seller = "checked";
      }
      text = text + "<div class='listado-title-wrapper'>";
      text = text + "<p class='txt-base__bold'>Sellers</p>";
      text = text + "</div>";
      text = text + "<ul class='listado-ul'>";
      text = text + "<li class='input-checkbox'>";
      text = text + "<div class='listado-checkbox-container'>";
      text =
        text +
        "<input type='checkbox' " +
        check_seller +
        " id='solo_seller' onclick='javascript:modificar_filtros(\"solo_seller_o\",\"solo_seller\",this)'>";
      text =
        text +
        "<label for='solo_seller' class='txt-base'>Productos Sellers</label>";
      text = text + "</div>";
      text = text + "</li>";
      text = text + "</ul>";
      document.getElementById("js-list_sellers").innerHTML = text;
    }
  }
}
function get_group_by_atributos(data, tipo) {
  let array_result = [];
  if (tipo == 1) {
    for (let key in data) {
      if (data.hasOwnProperty(key)) {
        if (
          key != "group_by_marca" &&
          key != "group_by_tallas" &&
          key != "group_by_categorias" &&
          key != "group_by_tallas_pais" &&
          key != "group_by_tallas_2"
        ) {
          let id_atributo = key;
          let valores_atributos = "";
          if (typeof data[id_atributo]["atributos"] !== "undefined") {
            valores_atributos =
              data[id_atributo]["atributos"]["id_atribut_valor"]["buckets"];
          } else {
            valores_atributos =
              data[id_atributo]["id_atribut_valor"]["buckets"];
          }
          if (valores_atributos.length == 0) {
            continue;
          } else {
            if (typeof data[id_atributo]["atributos"] !== "undefined") {
              valores_atributos =
                data[id_atributo]["atributos"]["id_atribut_valor"][
                  "buckets"
                ][0]["atributos"]["id_atribut_valor"]["buckets"];
            } else {
              valores_atributos =
                data[id_atributo]["id_atribut_valor"]["buckets"][0][
                  "atributos"
                ]["id_atribut_valor"]["buckets"];
            }
          }
          if (!array_result[id_atributo]) {
            array_result[id_atributo] = [];
          }
          let info_atributo = get_info_valor_atributo(id_atributo, "", true);
          array_result[id_atributo]["nombre_atributo"] =
            info_atributo["nombre_atributo"];
          array_result[id_atributo]["id_atributo"] = id_atributo;
          array_result[id_atributo]["operador"] =
            info_atributo["operador_atributo"];
          array_result[id_atributo]["prioridad"] = parseInt(
            info_atributo["prioridad_atributo"]
          );
          if (!array_result[id_atributo]["valores"]) {
            array_result[id_atributo]["valores"] = [];
          }
          for (let key2 in valores_atributos) {
            if (
              valores_atributos.hasOwnProperty(key2) &&
              typeof info_atributo["info_atributos_valor"] !== "undefined" &&
              typeof info_atributo["info_atributos_valor"][
                id_atributo_valor
              ] !== "undefined"
            ) {
              let info_valor_atribut = [];
              info_valor_atribut["doc_count"] =
                valores_atributos[key2]["doc_count"];
              let id_atributo_valor = valores_atributos[key2]["key"];
              info_valor_atribut["id_atributo_valor"] = id_atributo_valor;
              info_valor_atribut["nombre_id_atributo_valor"] =
                info_atributo["info_atributos_valor"][id_atributo_valor];
              array_result[id_atributo]["valores"].push(info_valor_atribut);
            }
          }
          multiSort(array_result[id_atributo]["valores"], {
            nombre_id_atributo_valor: "asc",
          });
        }
      }
    }
  } else {
    for (let key in data) {
      if (data.hasOwnProperty(key)) {
        let id_atributo = data[key]["key"];
        if (!array_result[id_atributo]) {
          array_result[id_atributo] = [];
        }
        let info_atributo = get_info_valor_atributo(id_atributo, "", true);
        array_result[id_atributo]["nombre_atributo"] =
          info_atributo["nombre_atributo"];
        array_result[id_atributo]["id_atributo"] = id_atributo;
        array_result[id_atributo]["operador"] =
          info_atributo["operador_atributo"];
        array_result[id_atributo]["prioridad"] = parseInt(
          info_atributo["prioridad_atributo"]
        );
        let valores_atributos =
          data[key]["valor_atributos"]["ids_atributos_valor"]["buckets"];
        if (!array_result[id_atributo]["valores"]) {
          array_result[id_atributo]["valores"] = [];
        }
        for (let key2 in valores_atributos) {
          if (
            valores_atributos.hasOwnProperty(key2) &&
            typeof info_atributo["info_atributos_valor"] !== "undefined"
          ) {
            let info_valor_atribut = [];
            info_valor_atribut["doc_count"] =
              valores_atributos[key2]["doc_count"];
            let id_atributo_valor = valores_atributos[key2]["key"];
            info_valor_atribut["id_atributo_valor"] = id_atributo_valor;
            info_valor_atribut["nombre_id_atributo_valor"] =
              info_atributo["info_atributos_valor"][id_atributo_valor];
            array_result[id_atributo]["valores"].push(info_valor_atribut);
          }
        }
        multiSort(array_result[id_atributo]["valores"], {
          nombre_id_atributo_valor: "asc",
        });
      }
    }
  }
  return array_result;
}
function mostrar_desplegable_dinamicos(datos_atr, ids_atributos_show) {
  let url_search = document.getElementById("url_search").value;
  let filtros_sel = document.getElementById("filtros_sel").value;
  let list_sel = filtros_sel.split("#");
  if (ids_atributos_show != "") ids_atributos_show = "," + ids_atributos_show;
  let text = "";
  let id_atributo = "";
  let pintar_atributo = false;
  let text_check_superior = "";
  let valores_no_mostrar = [
    5293, 6070, 2751, 7747, 5872, 5871, 5328, 8701, 7890, 8025, 7247, 9233,
    7482, 6752, 7942, 7877, 8235, 8585, 8022, 8339, 8314,
  ];
  datos_atr.forEach((group_atr) => {
    id_atributo = group_atr["id_atributo"];
    if (id_atributo == 940) {
    } else {
      let nombre_atributo_aux = group_atr["nombre_atributo"];
      let nombre_atribut = "";
      if (
        typeof nombre_atributo_aux !== "undefined" &&
        nombre_atributo_aux.length > 22
      )
        nombre_atribut = nombre_atributo_aux.slice(0, 22) + "...";
      else nombre_atribut = nombre_atributo_aux;
      let operador = group_atr["operador"];
      let list_atr_valores = group_atr["valores"];
      pintar_atributo = true;
      if (list_atr_valores.length == 1) pintar_atributo = false;
      if (ids_atributos_show != "") {
        let trobat_atr = ids_atributos_show.indexOf("," + id_atributo + ",");
        if (trobat_atr < 0) pintar_atributo = false;
      }
      if (pintar_atributo) {
        text = text + "<div>";
        text = text + "<div class='listado-title-wrapper'>";
        text =
          text +
          "<a onclick=\"javascript:desplegable('js-atributos_" +
          id_atributo +
          "');\" href='javascript:void(0);' title='" +
          nombre_atribut +
          "'>";
        text =
          text +
          "<p class='txt-base__bold titulo-filtros'>" +
          nombre_atribut +
          "</p>";
        text =
          text +
          "<div id='js-atributos_" +
          id_atributo +
          "_arrow' class='arrow-open'></div>";
        text = text + "</a>";
        text = text + "</div>";
        text =
          text +
          "<ul class='listado-ul' id='js-atributos_" +
          id_atributo +
          "'>";
        let text_check = "";
        let text_check_c = "";
        let class_input = "";
        let class_filtro_color = "";
        let nombre_atributo_valor = "";
        for (let j = 1; j < list_sel.length; j++) {
          let fl = list_sel[j].charAt(0);
          if (fl == "d") {
            let list_item = list_sel[j].slice(1, list_sel[j].length);
            let list_id = list_item.split("_");
            if (list_id[0] == id_atributo) {
              if (id_atributo == 695) {
                class_input = "color_" + list_id[1];
                class_filtro_color = "filter_color";
              } else {
                class_input = "";
                class_filtro_color = "";
              }
              text_check = "";
              let trobat_nom = false;
              for (let j1 = 0; j1 < list_atr_valores.length; j1++) {
                if (list_atr_valores[j1]["id_atributo_valor"] == list_id[1]) {
                  nombre_atributo_valor =
                    list_atr_valores[j1]["nombre_id_atributo_valor"];
                  trobat_nom = true;
                }
              }
              if (!trobat_nom) {
                let info_nombre_atributo_valor = get_info_valor_atributo(
                  "",
                  list_id[1],
                  false
                );
                nombre_atributo_valor =
                  info_nombre_atributo_valor["nombre_atributo_valor"];
              }
              text_check_c = text_check_c + "<li class='input-checkbox'>";
              text_check_c =
                text_check_c +
                "<div class='listado-checkbox-container " +
                class_filtro_color +
                "'>";
              text_check =
                text_check +
                "<input type='checkbox' checked id='" +
                list_item +
                "' onclick='javascript:modificar_filtros(\"" +
                list_id[0] +
                '","' +
                list_id[1] +
                "_" +
                list_id[2] +
                "\",this)'>";
              text_check =
                text_check +
                "<label for='" +
                list_item +
                "' class='txt-base " +
                class_input +
                "'>" +
                nombre_atributo_valor +
                "</label>";
              text_check_c = text_check_c + text_check;
              text_check_c = text_check_c + "</div>";
              text_check_c = text_check_c + "</li>";
              text_check_superior =
                text_check_superior +
                "<div class='filters-top__active'>" +
                text_check +
                "</div>";
            }
          }
        }
        text = text + text_check_c;
        for (let j = 0; j < list_atr_valores.length; j++) {
          let id_atributo_valor = list_atr_valores[j]["id_atributo_valor"];
          let nombre_valor = list_atr_valores[j]["nombre_id_atributo_valor"];
          let num_prods_atributo = list_atr_valores[j]["doc_count"];
          let abuscar = id_atributo + "_" + id_atributo_valor + "_" + operador;
          if (url_search.indexOf(abuscar) !== -1) {
          } else {
            if (valores_no_mostrar.indexOf(id_atributo_valor) < 0) {
              if (id_atributo == 695)
                class_input = "color_" + id_atributo_valor;
              else class_input = "";
              text = text + "<li class='input-checkbox'>";
              text = text + "<div class='listado-checkbox-container'>";
              text =
                text +
                "<input type='checkbox' id='" +
                id_atributo +
                "_" +
                id_atributo_valor +
                "_" +
                operador +
                "' onclick='javascript:modificar_filtros(\"" +
                id_atributo +
                '","' +
                id_atributo_valor +
                "_" +
                operador +
                "\",this)'>";
              text =
                text +
                "<label for='" +
                id_atributo +
                "_" +
                id_atributo_valor +
                "_" +
                operador +
                "' class='txt-base " +
                class_input +
                "'>" +
                nombre_valor +
                "</label>";
              text =
                text +
                "<span class='listado-result-number'> " +
                num_prods_atributo +
                "</span>";
              text = text + "</div>";
              text = text + "</li>";
            }
          }
        }
        text = text + "</ul>";
        text = text + "</div>";
      }
    }
  });
  document.getElementById("js-list-atributos").innerHTML = text;
  return text_check_superior;
}
var div_scroll_infinity = document;
div_scroll_infinity.addEventListener("scroll", function () {
  setTimeout(function () {
    if (document.getElementById("done")) {
      let items_listado = document.querySelector(".listado-grid");
      let height = items_listado.offsetHeight - 600;
      let scrolling = div_scroll_infinity.documentElement.scrollTop > height;
      let done = document.getElementById("done").value;
      if (scrolling && done == 0) {
        mostrar_spinner();
        document.getElementById("done").value = 1;
        document.getElementById("js-loading").classList.add("-novisibility");
        if (
          parseInt(document.getElementById("total_results").value) >
            parseInt(document.getElementById("num_pagina").value) &&
          parseInt(document.getElementById("num_pagina").value) > 0 &&
          done == 0
        ) {
          modificar_filtros(
            "start=",
            document.getElementById("num_pagina").value,
            ""
          );
          document
            .getElementById("js-loading")
            .classList.remove("-novisibility");
        } else {
          esconder_spinner();
        }
      }
    }
  }, 300);
});
function cargar_mas() {
  modificar_filtros("start=", document.getElementById("num_pagina").value, "");
}
function irTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function ucwords(str) {
  return (str + "").replace(/^([a-z])|\s+([a-z])/g, function ($1) {
    return $1.toUpperCase();
  });
}
function guardar_position(id_modelo) {
  let pathName = document.location.pathname;
  localStorage.setItem("scrollPosition_" + pathName, id_modelo);
}
function desplegable(valor) {
  var valorElement = document.getElementById(valor);
  var valorElementArrow = document.getElementById(valor + "_arrow");
  if (valorElement.classList.contains("-novisibility")) {
    valorElement.classList.add("-visibility");
    valorElement.classList.remove("-novisibility");
    valorElementArrow.classList.add("arrow-open");
    valorElementArrow.classList.remove("arrow-closed");
    if (valor == "js-marcas") {
      document
        .getElementById("js-marcas_ver_mas_menos")
        .classList.add("-visibility");
      document
        .getElementById("js-marcas_ver_mas_menos")
        .classList.remove("-novisibility");
    } else if (valor == "js-tallas") {
      let listaTallas = document.getElementById("js-tallas");
      var elementosLi = listaTallas.getElementsByTagName("li");
      var cantidadDeElementosLi = elementosLi.length;
      if (cantidadDeElementosLi >= 12) {
        document
          .getElementById("js-tallas_ver_mas_menos")
          .classList.add("-visibility");
        document
          .getElementById("js-tallas_ver_mas_menos")
          .classList.remove("-novisibility");
      }
    }
  } else {
    valorElement.classList.remove("-visibility");
    valorElement.classList.add("-novisibility");
    valorElementArrow.classList.remove("arrow-open");
    valorElementArrow.classList.add("arrow-closed");
    if (valor == "js-marcas") {
      document
        .getElementById("js-marcas_ver_mas_menos")
        .classList.add("-novisibility");
      document
        .getElementById("js-marcas_ver_mas_menos")
        .classList.remove("-visibility");
    } else if (valor == "js-tallas") {
      document
        .getElementById("js-tallas_ver_mas_menos")
        .classList.add("-novisibility");
      document
        .getElementById("js-tallas_ver_mas_menos")
        .classList.remove("-visibility");
    }
  }
}
function ver_mas_menos(id) {
  if (id == "marcas") {
    if (
      document.getElementById("js-marcas_top") &&
      document
        .getElementById("js-marcas_top")
        .classList.contains("-novisibility")
    ) {
      document.getElementById("js-marcas_top").classList.add("-visibility");
      document
        .getElementById("js-marcas_top")
        .classList.remove("-novisibility");
      document
        .getElementById("js-marcas_alfabetic")
        .classList.add("-novisibility");
      document
        .getElementById("js-marcas_alfabetic")
        .classList.remove("-visibility");
      document.getElementById("js-marcas_text_mas_menos").innerHTML =
        get_var_storage("ver_mas") + "...";
    } else {
      if (document.getElementById("js-marcas_top")) {
        document.getElementById("js-marcas_top").classList.add("-novisibility");
        document
          .getElementById("js-marcas_top")
          .classList.remove("-visibility");
        document
          .getElementById("js-marcas_alfabetic")
          .classList.add("-visibility");
        document
          .getElementById("js-marcas_alfabetic")
          .classList.remove("-novisibility");
        document.getElementById("js-marcas_text_mas_menos").innerHTML =
          get_var_storage("ver_menos");
      }
    }
  } else {
    if (
      !document
        .getElementById("js-tallas_ver_mas_menos")
        .classList.contains("-visibility")
    ) {
      var x = document.getElementsByClassName("no_li_tallas");
      for (var i = 0; i < x.length; i++) {
        x[i].classList.add("-novisibility");
        x[i].classList.remove("-visibility");
      }
      document
        .getElementById("js-tallas_ver_mas_menos")
        .classList.add("-visibility");
      document.getElementById("js-tallas_text_mas_menos").innerHTML =
        get_var_storage("ver_mas") + "...";
    } else {
      var x = document.getElementsByClassName("no_li_tallas");
      for (var i = 0; i < x.length; i++) {
        x[i].classList.add("-visibility");
        x[i].classList.remove("-novisibility");
      }
      document
        .getElementById("js-tallas_ver_mas_menos")
        .classList.remove("-visibility");
      document.getElementById("js-tallas_text_mas_menos").innerHTML =
        get_var_storage("ver_menos");
    }
  }
}
function modificar_filtros(tipo, valor, actual) {
  let url_search = document.getElementById("url_search").value;
  let filtros_sel_ant = document.getElementById("filtros_sel").value;
  let id_tienda = document.getElementById("id_tienda").value;
  guardar_position(0);
  let estic_paginant = 0;
  let filtros_compatibles = 0;
  let resta_url = "";
  let list_start = "";
  let nova_url = "";
  let list_start_aux = "";
  let nova_url_aux = "";
  let ordenacio = "";
  if (tipo == "sort=") {
    list_start = url_search.split(tipo);
    if (list_start.length > 1) {
      list_start_aux = list_start[1].split("&");
      if (list_start_aux.length > 1) {
        for (let k = 1; k < list_start_aux.length; k++) {
          resta_url = resta_url + "&" + list_start_aux[k];
        }
      }
    }
    if (!actual.checked) {
      let ordenacio = "";
      if (id_tienda == 9) {
        ordenacio = "order_rec;asc@id_subfamilia_principal;asc";
      } else {
        ordenacio = "v30_sum;desc@tm" + id_tienda + ";asc";
      }
      if (ordenacio != "") {
        if (list_start.length == 1) {
          nova_url_aux = list_start[0] + "&" + tipo + ordenacio + resta_url;
        } else {
          nova_url_aux = list_start[0] + tipo + ordenacio + resta_url;
        }
      } else {
        nova_url_aux = list_start[0] + resta_url;
      }
      document.getElementById("sort_precio_desc").checked = false;
      document.getElementById("sort_precio_asc").checked = false;
      document.getElementById("sort_novedades").checked = false;
      document.getElementById("sort_populares").checked = true;
    } else {
      let ordenacio = "";
      if (valor == "asc" || valor == "desc") {
        let id_pais_price = info_pais["id_pais"];
        ordenacio = "precio_win_" + id_pais_price + ";" + valor;
      } else if (valor == "novedades") {
        ordenacio =
          "productes.sellers.id_seller;asc@id_modelo;desc@fecha_descatalogado;desc";
      } else if (valor == "populares") {
        ordenacio = "v30_sum;desc@tm" + id_tienda + ";asc";
      }
      if (list_start.length == 1) {
        nova_url_aux = list_start[0] + "&" + tipo + ordenacio + resta_url;
      } else {
        nova_url_aux = list_start[0] + tipo + ordenacio + resta_url;
      }
      if (valor == "asc") {
        document.getElementById("sort_precio_desc").checked = false;
        document.getElementById("sort_precio_asc").checked = true;
        document.getElementById("sort_novedades").checked = false;
        document.getElementById("sort_populares").checked = false;
      } else if (valor == "desc") {
        document.getElementById("sort_precio_desc").checked = true;
        document.getElementById("sort_precio_asc").checked = false;
        document.getElementById("sort_novedades").checked = false;
        document.getElementById("sort_populares").checked = false;
      } else if (valor == "novedades") {
        document.getElementById("sort_precio_desc").checked = false;
        document.getElementById("sort_precio_asc").checked = false;
        document.getElementById("sort_novedades").checked = true;
        document.getElementById("sort_populares").checked = false;
      } else if (valor == "populares") {
        document.getElementById("sort_precio_desc").checked = false;
        document.getElementById("sort_precio_asc").checked = false;
        document.getElementById("sort_novedades").checked = false;
        document.getElementById("sort_populares").checked = true;
      }
    }
  } else if (tipo == "start=") {
    list_start = url_search.split(tipo);
    let add_and = "";
    if (list_start.length > 1) {
      list_start_aux = list_start[1].split("&");
      if (list_start_aux.length > 1) {
        for (k = 1; k < list_start_aux.length; k++) {
          resta_url = resta_url + "&" + list_start_aux[k];
        }
      }
    } else {
      add_and = "&";
    }
    nova_url = list_start[0] + add_and + tipo + valor + resta_url;
    estic_paginant = 1;
  } else {
    let check = actual.checked;
    let nom_filtro = actual.nextElementSibling.textContent;
    let mod_filtro = "";
    let filtros_sel_nou = "";
    let list_nom_filtro = "";
    let val_filtro_sel = "";
    let val = "";
    if (tipo == "categorias") {
      mod_filtro = "id_subfamilia";
      val = valor;
      list_nom_filtro = nom_filtro.split("(");
      val_filtro_sel = "#c" + valor + "@" + list_nom_filtro[0].trim();
    } else if (tipo == "marcas") {
      mod_filtro = "marca";
      val = valor;
      list_nom_filtro = nom_filtro.split("(");
      val_filtro_sel = "#m" + valor + "@" + list_nom_filtro[0].trim();
    } else if (tipo == "tallas_" + info_pais["talla_code"]) {
      mod_filtro = "talla_" + info_pais["talla_code"];
      let valor_aux = valor.split("+").join("%2B");
      valor_aux = valor_aux.split("&").join("%26");
      val = valor_aux;
      list_nom_filtro = nom_filtro.split("(");
      val_filtro_sel = "#tlocal" + valor + "@" + list_nom_filtro[0].trim();
    } else if (tipo == "tallas") {
      mod_filtro = "talla";
      let valor_aux = valor.split("+").join("%2B");
      valor_aux = valor_aux.split("&").join("%26");
      val = valor_aux;
      list_nom_filtro = nom_filtro.split("(");
      val_filtro_sel = "#t1" + valor + "@" + list_nom_filtro[0].trim();
    } else if (tipo == "tallas2") {
      mod_filtro = "talla2";
      let valor_aux = valor.split("+").join("%2B");
      valor_aux = valor_aux.split("&").join("%26");
      val = valor_aux;
      list_nom_filtro = nom_filtro.split("(");
      val_filtro_sel = "#t2" + valor + "@" + list_nom_filtro[0].trim();
    } else if (tipo == "stock") {
      mod_filtro = "exist";
      val = "1";
      val_filtro_sel = "";
    } else if (tipo == "solo_seller_o") {
      mod_filtro = "solo_seller";
      val = "1";
      val_filtro_sel = "";
    } else if (tipo == "atributos_compatibles") {
      if (document.getElementById("filtrar_compatibles").checked) {
        filtros_compatibles = 1;
      }
      mod_filtro = "atributos";
      val_filtro_sel = "";
      val = "";
      let list_valors = valor.split(",");
      for (let lv = 0; lv < list_valors.length; lv++) {
        if (document.getElementById(list_valors[lv]) !== null) {
          if (val != "") val += ",";
          val += list_valors[lv];
          nom_filtro = document.getElementById(list_valors[lv])
            .nextElementSibling.innerHTML;
          list_nom_filtro = nom_filtro.split("(");
          val_filtro_sel +=
            "#d" + list_valors[lv] + "@" + list_nom_filtro[0].trim();
        }
      }
    } else {
      mod_filtro = "atributos";
      val = tipo + "_" + valor;
      list_nom_filtro = nom_filtro.split("(");
      val_filtro_sel = "#d" + val + "@" + list_nom_filtro[0].trim();
    }
    url_search = url_search.split("@@").join("@");
    url_search = url_search.split("&&").join("&");
    let list = url_search.split(mod_filtro + "=");
    if (list.length == 1) {
      let aux1 = url_search.split("pf=");
      if (aux1.length == 1) {
        nova_url_aux = "pf=" + mod_filtro + "=" + val + "&" + aux1[0];
      } else {
        let aux_post_filters = aux1[1].split("&");
        let aux_pf = aux_post_filters[0];
        let aux_resta = "";
        for (let k = 1; k < aux_post_filters.length; k++) {
          aux_resta = aux_resta + "&" + aux_post_filters[k];
        }
        let aux_concatenar = aux_pf + "@" + mod_filtro + "=" + val;
        nova_url_aux = aux1[0] + "pf=" + aux_concatenar + aux_resta;
      }
      filtros_sel_nou = filtros_sel_ant + val_filtro_sel;
    } else {
      let inici_url = list[0];
      let list_fi = list[1].split("&");
      let list_mig = list_fi[0];
      let result = list_mig.split("@");
      let ids_post_filters = result[0];
      let concat_post_filters = "";
      if (result.length > 1) {
        for (let k = 1; k < result.length; k++) {
          concat_post_filters = concat_post_filters + "@" + result[k];
        }
      }
      for (k = 1; k < list_fi.length; k++) {
        resta_url = resta_url + "&" + list_fi[k];
      }
      var valors_filtre_concat = "";
      if (check) {
        valors_filtre_concat = ids_post_filters + "," + val;
        filtros_sel_nou = filtros_sel_ant + val_filtro_sel;
      } else {
        if (tipo == "atributos_compatibles" && filtros_compatibles == 0) {
          valors_filtre_concat = "";
        } else {
          let list_f = ids_post_filters.split(",");
          for (let k = 0; k < list_f.length; k++) {
            if (list_f[k] != val) {
              if (k > 0 && valors_filtre_concat != "") {
                valors_filtre_concat = valors_filtre_concat + "," + list_f[k];
              } else {
                valors_filtre_concat = valors_filtre_concat + list_f[k];
              }
            }
          }
        }
        filtros_sel_nou = filtros_sel_ant.replace(val_filtro_sel, "");
      }
      let nova_list_mig = "";
      if (valors_filtre_concat != "") {
        if (inici_url == "pf=") {
          nova_list_mig = inici_url + mod_filtro + "=" + valors_filtre_concat;
        } else {
          nova_list_mig =
            inici_url + "@" + mod_filtro + "=" + valors_filtre_concat;
        }
      } else {
        if (inici_url == "pf=" && concat_post_filters == "") {
          nova_list_mig = "";
        } else {
          nova_list_mig = inici_url;
        }
      }
      nova_url_aux = nova_list_mig + concat_post_filters + resta_url;
    }
    nova_url_aux = nova_url_aux.split("@@").join("@");
    nova_url_aux = nova_url_aux.split("&&").join("&");
    document.getElementById("filtros_sel").value = filtros_sel_nou;
  }
  if (tipo != "start=") {
    resta_url = "";
    let list_nova_url = nova_url_aux.split("&start=");
    if (list_nova_url.length > 1) {
      let list_resta = list_nova_url[1].split("&");
      for (let k = 1; k < list_resta.length; k++) {
        resta_url = resta_url + "&" + list_resta[k];
      }
    }
    let l_char = list_nova_url[0].charAt(list_nova_url[0].length - 1);
    let add_char = "";
    if (l_char != "&") {
      add_char = "&";
    }
    nova_url = list_nova_url[0] + add_char + "start=0" + resta_url;
    document.getElementById("num_pagina").value = 0;
    document.getElementById("done").value = 0;
    document.getElementById("js-loading").classList.remove("-novisibility");
  }
  if (filtros_compatibles == 1) {
    nova_url += "&filtro_c=1";
  } else if (tipo == "atributos_compatibles" && filtros_compatibles == 0) {
    let list_filtro_c = url_search.split("filtro_c=");
    if (list_filtro_c.length > 1) {
      nova_url = nova_url.replace("&filtro_c=1", "");
    }
  }
  document.getElementById("url_search").value = nova_url;
  onloadPageHome(1, estic_paginant);
}
function changeUrl(value) {
  var stateObj = { foo: "bar" };
  var currURL = window.location.href;
  let opciones = currURL.charAt(currURL.length - 4);
  if (opciones == "ades")
    document.getElementById("ultimo_url").value = "novedades";
  else if (opciones == "rtas")
    document.getElementById("ultimo_url").value = "ofertas";
  else if (opciones == "dido")
    document.getElementById("ultimo_url").value = "mas_vendido";
  else if (document.getElementById("ultimo_url").value == "") {
    let l_char = currURL.charAt(currURL.length - 1);
    if (l_char == "s" || l_char == "m" || l_char == "x" || l_char == "t") {
      document.getElementById("ultimo_url").value = l_char;
    } else {
      let aux_search = window.location.href.split("#");
      let aux_search_google = window.location.href.split("sg=1");
      var pos_arroba;
      if (aux_search.length > 1) {
        pos_arroba = window.location.href.indexOf("#");
      } else if (aux_search_google.length > 1) {
        pos_arroba = window.location.href.indexOf("sg=1");
      }
      var pos_antes_arro = pos_arroba - 1;
      var agregar = window.location.href[pos_antes_arro];
      var agregar1 = window.location.href[pos_antes_arro - 1];
      var agregar2 = window.location.href[pos_antes_arro - 2];
      var agregar3 = window.location.href[pos_antes_arro - 3];
      var ultimos = agregar3 + agregar2 + agregar1 + agregar;
      if (ultimos == "ades")
        document.getElementById("ultimo_url").value = "novedades";
      else if (ultimos == "rtas")
        document.getElementById("ultimo_url").value = "ofertas";
      else if (ultimos == "dido")
        document.getElementById("ultimo_url").value = "mas_vendido";
      else document.getElementById("ultimo_url").value = agregar;
    }
  }
  let lastChar = document.getElementById("ultimo_url").value;
  if (lastChar == "m") lastChar = "sm";
  if (lastChar == "t") lastChar = "at";
  if (currURL.indexOf("#") !== -1 || currURL.indexOf("sg=1") !== -1) {
    let re_search_google = window.location.href.split("sg=1");
    if (re_search_google.length > 1) {
      currURL = currURL.replace("sg=1&", "#");
    }
    var re = /(#.*)/g;
    if (value == "") {
      var value2 = currURL.replace(re, value);
    } else {
      var value2 = currURL.replace(re, "#" + value);
    }
    window.history.pushState(stateObj, "Titulo", value2);
  } else {
    if (value != "") window.history.replaceState("", "", currURL + "#" + value);
  }
}
function get_filtros_sel_url() {
  document.getElementById("filtros_sel").value = "";
  let url_search = document.getElementById("url_search").value;
  let text_anterior = "";
  let text_nou = "";
  let text = "";
  let list_post_filters = url_search.split("pf=");
  if (list_post_filters.length > 1) {
    let list_post_filters_aux = list_post_filters[1].split("&");
    let list_pf = list_post_filters_aux[0];
    let list_subfam = list_pf.split("id_subfamilia=");
    if (list_subfam.length > 1) {
      let list_subfam_aux = list_subfam[1].split("@");
      let list = list_subfam_aux[0];
      let list_count = list.split(",");
      for (let fs = 0; fs < list_count.length; fs++) {
        text = text + "#c" + list_count[fs];
      }
      text_anterior = document.getElementById("filtros_sel").value;
      text_nou = text_anterior + text;
      document.getElementById("filtros_sel").value = text_nou;
    }
    let list_marcas = list_pf.split("marca=");
    text = "";
    if (list_marcas.length > 1) {
      let list_marcas_aux = list_marcas[1].split("@");
      let list = list_marcas_aux[0];
      let list_count = list.split(",");
      for (fs = 0; fs < list_count.length; fs++) {
        text = text + "#m" + list_count[fs];
      }
      text_anterior = document.getElementById("filtros_sel").value;
      text_nou = text_anterior + text;
      document.getElementById("filtros_sel").value = text_nou;
    }
    let list_tallas = list_pf.split("talla=");
    if (list_tallas.length > 1) {
      let list_tallas_aux = list_tallas[1].split("@");
      let list_aux_filtros = "";
      list_aux_filtros = list_tallas_aux[0].split("(").join("");
      list_aux_filtros = list_aux_filtros.split(")").join("");
      list_aux_filtros = list_aux_filtros.split('"').join("");
      list_aux_filtros = list_aux_filtros.split("%2B").join("+");
      list_aux_filtros = list_aux_filtros.split("%26").join("&");
      let f_tallas = list_aux_filtros.split(",");
      let text_f = "";
      for (let k = 0; k < f_tallas.length; k++) {
        text_f = text_f + "#t1" + f_tallas[k] + "@" + f_tallas[k];
      }
      text_anterior = document.getElementById("filtros_sel").value;
      text_nou = text_anterior + text_f;
      document.getElementById("filtros_sel").value = text_nou;
    }
    let list_tallas2 = list_pf.split("talla2=");
    if (list_tallas2.length > 1) {
      let list_tallas2_aux = list_tallas2[1].split("@");
      let list_aux_filtros = "";
      list_aux_filtros = list_tallas2_aux[0].split("(").join("");
      list_aux_filtros = list_aux_filtros.split(")").join("");
      list_aux_filtros = list_aux_filtros.split('"').join("");
      list_aux_filtros = list_aux_filtros.split("%2B").join("+");
      list_aux_filtros = list_aux_filtros.split("%26").join("&");
      let f_tallas2 = list_aux_filtros.split(",");
      let text_f = "";
      for (let k = 0; k < f_tallas2.length; k++) {
        text_f = text_f + "#t2" + f_tallas2[k] + "@" + f_tallas2[k];
      }
      text_anterior = document.getElementById("filtros_sel").value;
      text_nou = text_anterior + text_f;
      document.getElementById("filtros_sel").value = text_nou;
    }
    if (info_pais["talla_code"] != "" && info_pais["talla_code"] != "NOTINC") {
      let list_tallas_local = list_pf.split(
        "talla_" + info_pais["talla_code"] + "="
      );
      if (list_tallas_local.length > 1) {
        let list_tallas_aux_local = list_tallas_local[1].split("@");
        let list_aux_filtros_local = "";
        list_aux_filtros_local = list_tallas_aux_local[0].split("(").join("");
        list_aux_filtros_local = list_aux_filtros_local.split(")").join("");
        list_aux_filtros_local = list_aux_filtros_local.split('"').join("");
        list_aux_filtros_local = list_aux_filtros_local.split("%2B").join("+");
        list_aux_filtros_local = list_aux_filtros_local.split("%26").join("&");
        let f_tallas_local = list_aux_filtros_local.split(",");
        let text_f_local = "";
        for (let k = 0; k < f_tallas_local.length; k++) {
          let talla_a_concatenar = info_pais["talla_code"];
          if (talla_a_concatenar == "usa") talla_a_concatenar = "US";
          let item_mostrar =
            talla_a_concatenar.toUpperCase() + " " + f_tallas_local[k];
          text_f_local =
            text_f_local + "#tlocal" + f_tallas_local[k] + "@" + item_mostrar;
        }
        text_anterior = document.getElementById("filtros_sel").value;
        text_nou = text_anterior + text_f_local;
        document.getElementById("filtros_sel").value = text_nou;
      }
    }
    let list_dinamics = list_pf.split("atributos=");
    text = "";
    if (list_dinamics.length > 1) {
      let list_mig = list_dinamics[1].split("@");
      let list_atr = list_mig[0];
      let list_count = list_atr.split(",");
      for (let fs = 0; fs < list_count.length; fs++) {
        text = text + "#d" + list_count[fs];
      }
      text_anterior = document.getElementById("filtros_sel").value;
      text_nou = text_anterior + text;
      document.getElementById("filtros_sel").value = text_nou;
    }
  }
}
function abrir_filtros_mobile() {
  this.event.preventDefault();
  const botonFiltros = document.getElementById("js_filtros_mobile");
  if (botonFiltros) {
    botonFiltros.classList.add("-visibility");
  }
  const arrowTop = document.getElementById("js_arrow-top-wrapper");
  if (arrowTop) {
    arrowTop.classList.add("-novisibility");
  }
  const cerrarFiltros = document.getElementById("js-cerrar-filtros");
  if (cerrarFiltros) {
    cerrarFiltros.classList.add("-visibility");
  }
  const capaOverlayFilters = document.getElementById("js-capa_overlay_filters");
  if (capaOverlayFilters) {
    capaOverlayFilters.classList.remove("-novisibility");
    capaOverlayFilters.addEventListener("click", function () {
      cerrar_filtros_mobile();
      document
        .getElementById("js-capa_overlay_filters")
        .classList.add("-novisibility");
    });
  }
  const body = document.getElementById("body");
  if (body) {
    body.classList.add("-sticky");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function cerrar_filtros_mobile2(element, event) {
  if (event.srcElement.dataset.check == "cerrar_filtro") {
    cerrar_filtros_mobile();
  }
}
function cerrar_filtros_mobile() {
  this.event.preventDefault();
  const botonFiltros = document.getElementById("js_filtros_mobile");
  if (botonFiltros) {
    botonFiltros.classList.remove("-visibility");
  }
  const arrowTop = document.getElementById("js_arrow-top-wrapper");
  if (arrowTop) {
    arrowTop.classList.remove("-novisibility");
  }
  const cerrarFiltros = document.getElementById("js-cerrar-filtros");
  if (cerrarFiltros) {
    cerrarFiltros.classList.remove("-visibility");
  }
  if (
    !document
      .getElementById("js-capa_overlay_filters")
      .classList.contains("-novisibility")
  ) {
    document
      .getElementById("js-capa_overlay_filters")
      .classList.add("-novisibility");
  }
  const body = document.getElementById("body");
  if (body) {
    body.classList.remove("-sticky");
  }
}
async function pintar_productos_id_modelos(id_modelos, next) {
  let vars_filtro = "id_modelo=" + id_modelos;
  let idioma = document.getElementById("idioma").value;
  let vars_excluir = "id_marca_e=78,147";
  let vars_source =
    "model." +
    idioma +
    ";id_marca;model.eng;sostenible;fecha_descatalogado;id_marca;video_mp4;tres_sesenta;productes.talla;productes.talla2;id_modelo;familias.id_familia;familias.subfamilias.id_tienda;familias.subfamilias.id_subfamilia;atributos_padre.atributos;productes.baja;productes.id_producte;productes.desc_brand;productes.brut;productes.exist;productes.pmp;productes.rec;productes.stock_reservat;productes.v90;productes.color;id_producte_pais_win." +
    info_pais["id_pais"] +
    ";precio_win_" +
    info_pais["id_pais"] +
    ";marca;productes.sellers.id_seller;productes.sellers.precios_paises.precio;productes.sellers.precios_paises.id_pais";
  let vars_sort = "id_modelo;asc";
  let size = 100;
  let vars_from = "0";
  let query = construir_query_elastic(
    vars_filtro,
    vars_excluir,
    vars_source,
    vars_sort,
    size,
    vars_from,
    true,
    false
  );
  let response = await get_info_elastic(query);
  if (next == 0) {
    id_carregar_codi = "id_modelos_landing_ver";
  } else id_carregar_codi = "id_modelos_landing_ver_" + next;
  let item_list = await pintar_productos(
    id_carregar_codi,
    false,
    response,
    [],
    "",
    []
  );
  document.getElementById(id_carregar_codi).innerHTML =
    "<ul class='listado-grid' id='js-producto-listado-grid'>" +
    item_list +
    "</ul>";
}
function show_options_sort() {
  if (document.getElementById("js-sort").classList.contains("-novisibility")) {
    document.getElementById("js-sort").classList.remove("-novisibility");
    document.getElementById("js-sort_arrow").classList.add("arrow-open");
    document.getElementById("js-sort_arrow").classList.remove("arrow-closed");
  } else {
    document.getElementById("js-sort").classList.add("-novisibility");
    document.getElementById("js-sort_arrow").classList.remove("arrow-open");
    document.getElementById("js-sort_arrow").classList.add("arrow-closed");
  }
}
