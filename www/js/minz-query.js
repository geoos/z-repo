const descTempos = {
    "5m":"cada 5 minutos", "15m":"cada 15 minutos", "30m":"cada 30 minutos",
    "1h":"por hora", "6h":"cada 6 horas", "12h":"cada 12 horas",
    "1d":"diario", 
    "1M":"mensual", "3M":"trimestral", "4M":"cuatrimestral", "6M":"semestral",
    "1y":"anual"
}
const descAcums = {
    "n":"nº muestras", "sum":"acumulado", "avg":"promedio", "min":"mínimo", "max":"máximo"
}
const nivelesTemporalidad = ["5m", "15m", "30m", "1h", "6h", "12h", "1d", "1M", "3M", "4M", "6M", "1y"];
const bloquesTemporalidad = ["Bloques de 5m", "Bloques de 15m", "Bloques de 30m", "Bloques de 1h", "Bloques de 6h", "Medios días", "Días", "Meses", "Trimestres", "Cuatrimestres", "Semestres", "Años"];
const bloquesFavoritos = {
    "5m":3, "15m":3, "30m":3,
    "1h":6, "6h":6, "12h":6,
    "1d":6, 
    "1M":11, "3M":11, "4M":11, "6M":11,
    "1y":11
}
const rangosTemporalidad = {
    "5m":1000 * 60 * 5, "15m":1000 * 60 * 5, "30m":1000 * 60 * 30,
    "1h":1000 * 60 * 60, "6h":1000 * 60 * 60 * 6, "12h":1000 * 60 * 60 * 12,
    "1d":1000 * 60 * 60 * 24,
    "1M":1000 * 60 * 60 * 24 * 30, "3M":1000 * 60 * 60 * 24 * 30 * 3, "4M":1000 * 60 * 60 * 24 * 30 * 4, "6M":1000 * 60 * 60 * 24 * 30 * 6,
    "1y":1000 * 60 * 60 * 24 * 365
}
const shortMeses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

function getLimitesDefaultBloquesTemporalidad(idxBloque) {
    let ms = Date.now();
    let start = moment.tz(ms, window.timeZone);
    let end = start.clone();
    switch(idxBloque) {
        case 0: 
        case 1:
        case 2:         
            start = start.startOf("hour");
            end = start.clone().add(1, "hour");
            break;
        case 3:
        case 4:
        case 5:
            start = start.startOf("day");
            end = start.clone().add(1, "day");
            break;
        case 6:
            start = start.startOf("month");
            end = start.clone().add(1, "month");
            break
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
            start = start.startOf("year");
            end = start.clone().add(1, "year");
            break;
    }
    return {start, end}
}

function mismoDia(start, end) {
    return start.format("YYYY-MM-DD") == end.format("YYYY-MM-DD");
}
function mismoMes(start, end) {
    return start.format("YYYY-MM") == end.format("YYYY-MM");
}
function mismoAno(start, end) {
    return start.format("YYYY") == end.format("YYYY");
}
function describeTrimestre(d) {
    if (d.month() == 0) return "1º trimestre";
    if (d.month() == 3) return "2º trimestre";
    if (d.month() == 6) return "3º trimestre";
    if (d.month() == 9) return "4º trimestre";
    return "Trimestre inválido";
}
function describeCuatrimestre(d) {
    if (d.month() == 0) return "1º cuatrimestre";
    if (d.month() == 4) return "2º cuatrimestre";
    if (d.month() == 8) return "3º cuatrimestre";
    return "Cuatrimestre inválido";
}
function describeSemestre(d) {
    if (d.month() == 0) return "1º semestre";
    if (d.month() == 6) return "2º semestre";
    return "Semestre inválido";
}
function describePeriodoParaBloqueTemporalidad(idxBbloque, start, end) {
    if (idxBbloque <= 5) {
        // 5, 15, 30m, 1h, 6h, 12h
        if (mismoDia(start, end)) {
            return start.format("DD/MM/YYYY") + " [" + start.format("HH:mm") + " - " + end.format("HH:mm") + "[";
        } else {
            return "[" + start.format("DD/MM/YYYY HH:mm") + " - " + end.format("DD/MM/YYYY HH:mm") + "[";
        }
    } else if (idxBbloque == 6) {
        // 1d
        if (mismoDia(start, end.clone().subtract(1, "day"))) {
            return "El día " + start.format("DD/MM/YYYY")
        } else {
            return "[" + start.format("DD/MM/YYYY") + " - " + end.clone().subtract(1, "day").format("DD/MM/YYYY") + "]";
        }
    } else if (idxBbloque == 7) {
        // 1M
        if (mismoMes(start, end.clone().subtract(1, "month"))) {
            return "El mes de " + shortMeses[start.month()] + " del " + start.format("YYYY")
        } else {
            return "[" + shortMeses[start.month()] + "/" + start.format("YYYY") + " - " + shortMeses[end.clone().subtract(1, "month").month()] + "/" + end.clone().subtract(1, "month").format("YYYY") + "]";
        }
    } else if (idxBbloque == 8) {
        // 3M
        if (mismoMes(start, end.clone().subtract(3, "month"))) {
            return "El " + describeTrimestre(start) + " del " + start.format("YYYY")
        } else {
            return "[" + describeTrimestre(start) + " del " + start.format("YYYY") + " - " + describeTrimestre(end.clone().subtract(3, "month")) + " del " + end.clone().subtract(3, "month").format("YYYY") + "]";
        }
    } else if (idxBbloque == 9) {
        // 4M
        if (mismoMes(start, end.clone().subtract(4, "month"))) {
            return "El " + describeCuatrimestre(start) + " del " + start.format("YYYY")
        } else {
            return "[" + describeCuatrimestre(start) + " del " + start.format("YYYY") + " - " + describeCuatrimestre(end.clone().subtract(4, "month")) + " del " + end.clone().subtract(4, "month").format("YYYY") + "]";
        }
    } else if (idxBbloque == 10) {
        // 6M
        if (mismoMes(start, end.clone().subtract(6, "month"))) {
            return "El " + describeSemestre(start) + " del " + start.format("YYYY")
        } else {
            return "[" + describeSemestre(start) + " del " + start.format("YYYY") + " - " + describeSemestre(end.clone().subtract(6, "month")) + " del " + end.clone().subtract(6, "month").format("YYYY") + "]";
        }
    } else if (idxBbloque == 11) {
        // 1Y
        if (mismoAno(start, end.clone().subtract(1, "year"))) {
            return "El año " + start.format("YYYY")
        } else {
            return "[" + start.format("YYYY") + " - " + end.clone().subtract(1, "year").format("YYYY") + "]";
        }
    }
    return "??";
}

class GenericQuery {
    constructor(config) {
        this.id = "GQ" + parseInt(9999999999 * Math.random());
        this.config = config;
    }
    get name() {return this.config.name}
    get unit() {return "??"}
    get decimals() {return 2}
    get minZTemporality() {throw "minZTemporality not overwritten"}
    get timeRange() {throw "timeRange not overwritten"}

    redondea(value, includeUnit) {
        let pow = Math.pow(10, this.decimals);
        let txt = Math.floor(value * pow) / pow + "";
        if (includeUnit) txt += "[" + this.unit + "]";
    }
    query(args) {
        throw "No query";
    }
}

class MinZQuery {
    static cloneQuery(q) {
        // clonar filtros para asegurar inmutabilidad
        let filters = q.filters;
        if (filters) filters = JSON.parse(JSON.stringify(filters));
        return new MinZQuery(q.zRepoClient, q.variable, q.groupingDimension, q.fixedFilter, filters, q.accum, q.hGroupingDimension, q.vGroupingDimension);
    }
    constructor(zRepoClient, variable, groupingDimension, fixedFilter, filters, accum, hGroupingDimension, vGroupingDimension) {  
        this.zRepoClient = zRepoClient;
        this.variable = variable;
        this.temporality = variable.temporality;
        this.groupingDimension = groupingDimension;
        this.hGroupingDimension = hGroupingDimension;
        this.vGroupingDimension = vGroupingDimension;
        this.fixedFilter = fixedFilter;
        this.filters = filters || [];
        this.accum = accum || "sum";

        this.descripcionFiltros = null;
        this.descripcionAgrupador = null;
    } 

    get name() {return this.variable.name}
    get code() {return this.variable.code}
    get unit() {return this.variable && this.variable.options && this.variable.options.unit?this.variable.options.unit:"??"}
    get decimals() {return this.variable && this.variable.options && this.variable.options.decimals?this.variable.options.decimals:2}
    get minZTemporality() {return this.temporality}
    get dependsOnTime() {return true}
    get timeRange() {
        let t = this.temporality;
        if (!t || t == "none") return 0;
        return rangosTemporalidad[t];
    }

    get allFiltros() {
        let ret = [];
        if (this.fixedFilter && this.fixedFilter.ruta) {
            ret.push({filtro:this.fixedFilter, fijo:true});            
        }
        this.filters.forEach(f => ret.push({
            filtro:f, fijo:false
        }))
        return ret;
    }

    async describeFiltro(filtro) {        
        try {
            let clasificadoresPath = this.zRepoClient.describeRuta(this.variable, filtro.ruta);
            let st = clasificadoresPath.reduce((st, c) => {
                if (st.length) st += " => ";
                st += c.name;
                return st;
            }, "");
            let etiquetaValor;
            // Tomar datos del último clasificador para mostrar
            if (filtro.valor && filtro.valor.startsWith("${codigo-objeto}")) {
                st += " en mapa";
                etiquetaValor = "Selección en Mapa";
            } else {
                let c = clasificadoresPath[clasificadoresPath.length - 1];            
                let row = await this.zRepoClient.getValorDimension(c.dimensionCode, filtro.valor);            
                let v = row?row.name:filtro.valor;
                st += " igual a '" + v + "'";
                etiquetaValor = v;
            }
            return {etiqueta:st, etiquetaValor};
        } catch(error) {
            console.error(error);
            throw error;
        }
    }
    async construyeDescripcionFiltros() {
        try {
            let ret = [];
            if (this.fixedFilter && this.fixedFilter.ruta) {
                let etiquetas = await this.describeFiltro(this.fixedFilter);
                ret.push({
                    etiqueta:etiquetas.etiqueta,
                    etiquetaValor:etiquetas.etiquetaValor,
                    fijo:true,
                    ruta:this.fixedFilter.ruta,
                    valor:this.fixedFilter.valor
                });
            }
            for (let i=0; i<this.filters.length; i++) {
                let etiquetas = await this.describeFiltro(this.filters[i]);
                ret.push({
                    etiqueta:etiquetas.etiqueta,
                    etiquetaValor:etiquetas.etiquetaValor,
                    fijo:false,
                    ruta:this.filters[i].ruta,
                    valor:this.filters[i].valor
                });
            }
            this.descripcionFiltros = ret;
            if (this.groupingDimension) {
                this.descripcionAgrupador = (await this.describeFiltro({ruta:this.groupingDimension, valor:"${codigo-objeto}"})).etiqueta
            } else {
                this.descripcionAgrupador = null;
            }
        } catch(error) {
            console.error(error);
            this.descripcionFiltros = null;
        }
    }

    async construyeArbolFiltrosDesde(nodos, dimOVar, path0, x0, y0, subArbolHabilitado, max) {
        if (max.x === undefined || x0 > max.x) max.x = x0;
        let dimensiones = await this.zRepoClient.getDimensiones();
        let y = y0;
        for (let i=0; i<dimOVar.classifiers.length; i++) {
            let c = dimOVar.classifiers[i];
            let nodo = {
                x:x0, y:y, clasificador:c, editable:subArbolHabilitado
            }
            if (max.y === undefined || y > max.y) max.y = y;
            let path = path0 + (path0.length?".":"") + c.fieldName;
            nodo.ruta = path;
            let filtro = this.allFiltros.find(f => f.filtro.ruta == path);
            if (filtro) {
                nodo.filtro = filtro.filtro;
                if (filtro.fijo) nodo.editable = false;
                let desc = this.descripcionFiltros.find(f => f.ruta == path);
                nodo.descripcionFiltro = desc;
            } else if (subArbolHabilitado) {
                // Si es parte de la ruta del filtro fijo, se deshabilita
                if (this.allFiltros.find(f => f.fijo && f.filtro.ruta.startsWith(path))) {
                    nodo.editable = false;
                }
            }
            let dim = dimensiones.find(d => d.code == c.dimensionCode);
            if (!dim) throw "No se encontró la dimensión '" + c.dimensionCode + "' desde " + dimOVar.name;
            if (dim.classifiers && dim.classifiers.length) {
                nodo.nodos = [];
                y = await this.construyeArbolFiltrosDesde(nodo.nodos, dim, path, x0 + 1, y, nodo.editable && !nodo.filtro, max);
            } else {
                y++;
            }
            nodos.push(nodo);
        }
        return y;
    }
    async getArbolFiltros() {
        let nodos = [], max = {x:undefined, y:undefined};
        await this.construyeArbolFiltrosDesde(nodos, this.variable, "", 1, 0, true, max);
        return {max:max, nodos:nodos};
    }
    agregaFiltro(ruta, valor) {
        // Eliminar filtros existentes en subarbol
        this.filters.filter(f => f.ruta.startsWith(ruta + ".")).forEach(f => this.eliminaFiltro(f));

        this.filters.push({ruta:ruta, valor:valor});        
    }
    eliminaFiltro(filtro) {
        let idx = this.filters.findIndex(f => f.ruta == filtro.ruta);
        if (idx < 0) {
            throw "No se encontró el filtro por " + filtro.ruta;
        }
        this.filters.splice(idx, 1);
    }

    query(args) {
        console.log("query", args);
        let fixedFilter = this.fixedFilter?JSON.parse(JSON.stringify(this.fixedFilter)):null;
        if (args.objectCode && fixedFilter) {
            if (fixedFilter.valor == "${codigo-objeto}") fixedFilter.valor = args.objectCode;
        }
        let q;
        if (args.startTime) {
            this.startTime = args.startTime;
            this.endTime = args.endTime;
            this.timeDescription = "custom";
        } else if (!args.format.startsWith("dim-rows")) {
            let time = args.time;
            let temporality = args.temporality || this.variable.temporality;
            let {t0, t1, desc} = this.zRepoClient.normalizaTiempo(temporality, time);
            this.startTime = t0; this.endTime = t1; this.timeDescription = desc;
        }
        if (args.format == "dim-rows-count") {
            let filtro = {};
            if (this.filters) this.filters.forEach(f => this.zRepoClient.construyeFiltro(filtro, f.ruta, f.valor));
            if (this.fixedFilter) this.zRepoClient.construyeFiltro(filtro, this.fixedFilter.ruta, this.fixedFilter.valor);
            return zPost("getRowsCount.zrepo", {dimCode:this.code, textFilter:args.textFilter, filter:filtro});
        } else if (args.format == "dim-rows") {
            let filtro = {};
            if (this.filters) this.filters.forEach(f => this.zRepoClient.construyeFiltro(filtro, f.ruta, f.valor));
            if (this.fixedFilter) this.zRepoClient.construyeFiltro(filtro, this.fixedFilter.ruta, this.fixedFilter.valor);
            return zPost("getRows.zrepo", {dimCode:this.code, textFilter:args.textFilter, filter:filtro, startRow:args.startRow, nRows:args.nRows});
        } else if (args.format == "dim-serie") {
            q = {
                tipoQuery:"dim-serie", 
                filtros:this.filters, 
                variable:this.variable, 
                dimensionAgrupado:this.groupingDimension,
                acumulador:this.accum,
                temporality:this.temporality
            }
        } else if (args.format == "dim-dim") {
            q = {
                tipoQuery:"dim-dim", 
                filtros:this.filters, 
                variable:this.variable, 
                dimensionAgrupadoH:this.hGroupingDimension,
                dimensionAgrupadoV:this.vGroupingDimension,
                acumulador:this.accum,
                temporality:this.temporality
            }
        } else if (args.format == "time-serie") {
            q = {
                tipoQuery:"time-serie", 
                filtros:this.filters, 
                filtroFijo:fixedFilter,
                variable:this.variable, 
                acumulador:this.accum,
                temporalidad:this.temporality
            }
        } else throw "Format '" + args.format + "' not handled";
        return this.zRepoClient.query(q, this.startTime, this.endTime);
    }
}
