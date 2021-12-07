class Labels extends ZDashboardElement {
    get code() {return "labels"}
    onThis_init() {
    }
    parseText(text, vars) {
        let st = "";
        let i0 = 0;
        let i1 = text.indexOf("${", i0);        
        while (i1 >= 0) {
            let p = text.indexOf("}", i1);
            if (p >= 0) {
                st += text.substring(i0, i1);
                let varName = text.substring(i1+2, p);
                let value = vars[varName];
                if (value !== undefined) {
                    st += value;
                } else {
                    st += "${" + varName + "}";
                }
                i0 = p + 1;
                i1 = text.indexOf("${", i0); 
            } else {
                i1 = -1;
            }
        }
        return st + text.substring(i0);
    }
    async refresh(start, end) {
        try {
            this.dispose();
            if (!this.q) return;            
            let {promise, controller} = await this.q.query({
                format:"period-summary", startTime:start.valueOf(), endTime:end.valueOf()
            });
            let data = await promise;

            let vars = {sum:data.value, min:data.min, max:data.max, avg:data.n?data.value:data.n, n:data.n};
            vars.unit = (this.q.variable.options && this.q.variable.options.unit?this.q.variable.options.unit:"S/U");

            this.grid = [[null, null, null], [null, null, null], [null, null, null]];
            Object.keys(this.options.layout).forEach(pos => {
                let k = pos.toLowerCase();
                switch (k) {
                    case "nw": 
                        this.grid[0][0] = this.options.layout[pos];
                        break;
                    case "n": 
                        this.grid[0][1] = this.options.layout[pos];
                        break;
                    case "ne": 
                        this.grid[0][2] = this.options.layout[pos];
                        break;    
                    case "w": 
                        this.grid[1][0] = this.options.layout[pos];
                        break;
                    case "c": 
                        this.grid[1][1] = this.options.layout[pos];
                        break;
                    case "e": 
                        this.grid[1][2] = this.options.layout[pos];
                        break;    
                    case "sw": 
                        this.grid[2][0] = this.options.layout[pos];
                        break;
                    case "s": 
                        this.grid[2][1] = this.options.layout[pos];
                        break;
                    case "se": 
                        this.grid[2][2] = this.options.layout[pos];
                        break;    
                }
            })
            this.root.container.set("layout", am5.GridLayout.new(this.root, {maxColumns:3}));
            for (let row=0; row<3; row++) {
                for (let col=0; col<3; col++) {
                    let g = this.grid[row][col];
                    if (g) {
                        let lblOptions = {
                            fontSize:25, fontWeight:"500", textAlign:"center", paddingTop:10, paddingBottom:10                            
                        }
                        if (g.background || g.border) {
                            let backProps = {};
                            if (g.background) backProps.fill = g.background;
                            if (g.border) backProps.stroke = g.border;
                            lblOptions.background = am5.Rectangle.new(this.root, backProps);
                        }
                        if (g.fontSize) lblOptions.fontSize = g.fontSize;
                        if (g.fontWeight) lblOptions.fontWeight = g.fontWeight;
                        if (g.paddingLeft) lblOptions.paddingLeft = g.paddingLeft;
                        if (g.paddingRight) lblOptions.paddingRight = g.paddingRight;
                        if (g.paddingTop) lblOptions.paddingTop = g.paddingTop;
                        if (g.paddingBottom) lblOptions.paddingBottom = g.paddingBottom;
                        if (g.color) lblOptions.fill = g.color;

                        lblOptions.text = this.parseText(g.text, vars);
                        let label = am5.Label.new(this.root, lblOptions);
                        this.root.container.children.push(label);
                    } else {
                        //this.root.container.children.push(am5.Label.new(this.root, {text:""}));
                        this.root.container.children.push(am5.Rectangle.new(this.root, {width:0, height:0}));
                    }
                }
            }

            /*
            this.root.container.children.push(am5.Rectangle.new(this.root, {width:100, height:100, stroke: am5.color(0xFFFFFF)}));
            this.root.container.children.push(am5.Rectangle.new(this.root, {width:100, height:100, stroke: am5.color(0xFFFFFF)}));
            this.root.container.children.push(am5.Rectangle.new(this.root, {width:100, height:100, row:1, stroke: am5.color(0xFFFFFF)}));
            */
        } catch(error) {
            console.error(error);
        }
    }

}
ZVC.export(Labels);