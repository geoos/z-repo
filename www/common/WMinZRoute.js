class WMinZRoute extends ZDialog {
    async onThis_init(options) {
        this.consulta = MinZQuery.cloneQuery(options.consulta);
        this.ruta = options.ruta;
        await this.consulta.construyeDescripcionFiltros()
        this.arbol = await this.consulta.getArbolFiltros();
        this.cellWidth = 155; this.cellHeight = 72;
        this.rectWidth = 115; this.rectHeight = 56;
        let w = (this.arbol.max.x + 1) * this.cellWidth,
            h = (this.arbol.max.y + 1) * this.cellHeight;
        this.stage.size = {width:w, height:h};
        this.konvaStage = new Konva.Stage({
            container:this.stage.view,
            width:w, height:h
        })
        this.konvaLayer = new Konva.Layer();
        this.konvaStage.add(this.konvaLayer);
        this.refresca()            
    }

    refresca() {
        this.konvaLayer.destroyChildren();
        let x = this.cellWidth / 2;
        let y = this.cellHeight / 2;
        let roundedRect = new Konva.Rect({
            x:x - this.rectWidth / 2, y:y - this.rectHeight / 2, width:this.rectWidth, height:this.rectHeight,
            fill: '#5569cf',
            stroke: '#000000',
            strokeWidth: 1,
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOffset: { x: 4, y: 4 },
            shadowOpacity: 0.5,
            cornerRadius:3,
            opacity:1
        });
        this.konvaLayer.add(roundedRect);
        let text = new Konva.Text({
            x: x - this.rectWidth / 2,
            y: y - this.rectHeight / 2,
            width: this.rectWidth,
            height: this.rectHeight,
            fontSize: 14,
            fontFamily: 'Calibri',
            fill:"white",
            padding: 10,
            align:"center",
            verticalAlign:"middle",
            text:this.consulta.variable.name +(this.consulta.variable.options?"\n[" + this.consulta.variable.options.unit + "]":"")
        })
        this.konvaLayer.add(text);
        this.dibujaNodos(0,0, this.arbol.nodos);
        this.konvaLayer.draw();
    }

    dibujaNodos(parentX, parentY, nodos) {
        for (let i=0; i<nodos.length; i++) {
            let nodo = nodos[i];
            let nodoEnRuta = this.ruta && this.ruta.startsWith(nodo.ruta);
            let fillColor = "white";  // Editable, sin filtro
            let textColor = "black";  // Editable, sin filtro
            if (nodoEnRuta) {
                fillColor = "#f0b375";
                textColor = "black";
            }
            let x = this.cellWidth * nodo.x + this.cellWidth / 2;
            let y = this.cellHeight * nodo.y + this.cellHeight / 2;
            let roundedRect = new Konva.Rect({
                x:x - this.rectWidth / 2, y:y - this.rectHeight / 2, width:this.rectWidth, height:this.rectHeight,
                fill: fillColor,
                stroke: '#000000',
                strokeWidth: 1,
                shadowColor: 'black',
                shadowBlur: 10,
                shadowOffset: { x: 4, y: 4 },
                shadowOpacity: 0.5,
                cornerRadius:3,
                opacity:1
            });
            // Eventos
            roundedRect.on("mouseenter", _ => this.enterNodo(nodo));
            roundedRect.on("mouseleave", _ => this.exitNodo(nodo));
            roundedRect.on("mouseup", _ => this.clickNodo(nodo))            
            this.konvaLayer.add(roundedRect);
            
            // Titulo
            let titulo = new Konva.Text({
                x: x - this.rectWidth / 2,
                width: this.rectWidth,
                y: y - this.rectHeight / 2,
                height: this.rectHeight,
                fontSize: 12,
                fontFamily: 'Calibri',
                fill:textColor,
                padding: 10,
                align:"center",
                verticalAlign:"middle",
                text:nodo.clasificador.name,
                listenning:false
            })
            // Eventos
            titulo.on("mouseenter", _ => this.enterNodo(nodo));
            titulo.on("mouseleave", _ => this.exitNodo(nodo));
            titulo.on("mouseup", _ => this.clickNodo(nodo))
            this.konvaLayer.add(titulo);

            // Flecha
            let x0 = parentX * this.cellWidth + this.cellWidth / 2 + this.rectWidth / 2,
                y0 = parentY * this.cellHeight + this.rectHeight / 2,
                x1 = (parentX + 1) * this.cellWidth,
                y1 = y0,
                x2 = x1,
                y2 = nodo.y * this.cellHeight + this.rectHeight / 2,
                x3 = nodo.x * this.cellWidth + this.cellWidth / 2 - this.rectWidth / 2 - 4,
                y3 = y2;
            let arrow = new Konva.Arrow({
                points:[x0,y0, x1,y1, x2,y2, x3,y3],
                pointerLength:10,
                pointerWidth:8,
                fill:"white",
                stroke:"black",
                strokeWidth:2
            });
            this.konvaLayer.add(arrow);

            if (nodo.nodos) this.dibujaNodos(nodo.x, nodo.y, nodo.nodos);
        }
    }

    async clickNodo(nodo) {
        this.ruta = nodo.ruta;
        this.refresca();
    }

    releeYRefresca() {
        this.consulta.construyeDescripcionFiltros()
        .then(async _ => {
            this.arbol = await this.consulta.getArbolFiltros();
            this.refresca();
        })
    }

    enterNodo(nodo) {
        this.stage.view.style.setProperty("cursor", "pointer")
    }
    exitNodo() {
        this.stage.view.style.removeProperty("cursor");
    }

    onCmdOk_click() {
        this.close(this.ruta);
    }

    onCmdCancel_click() {this.cancel()}
}
ZVC.export(WMinZRoute);