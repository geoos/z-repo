class ZRepo {
    constructor(config) {
        this.config = config;
    }

    get domains() {
        let list = Object.keys(this.config.domains).reduce((list, code) => {
            list.push({code, name:this.config.domains[code]});
            return list;
        }, []);
        list.sort((d1, d2) => (d1.name > d2.name?1:-1))
        return list;
    }
    get dimensionsTree() {
        let domains = this.domains;
        domains.forEach(d => d.dimensions = []);
        Object.keys(this.config.dimensions).forEach(dimCode => {
            let p = dimCode.indexOf(".");
            if (p) {
                let dim = this.config.dimensions[dimCode];
                dim.code = dimCode;
                let domain = dimCode.substr(0, p);
                let d = domains.find(d => d.code == domain);
                if (d) d.dimensions.push(dim)
            }
        });
        domains = domains.filter(d => d.dimensions.length);
        domains.forEach(d => {
            d.dimensions.sort((d1, d2) => d1.name > d2.name?1:-1)
        })
        return domains;
    }
    get dataSetsTree() {
        let domains = this.domains;
        domains.forEach(d => d.dataSets = []);
        Object.keys(this.config.dataSets).forEach(dataSetCode => {
            let p = dataSetCode.indexOf(".");
            if (p) {
                let ds = this.config.dataSets[dataSetCode];
                ds.code = dataSetCode;
                let domain = dataSetCode.substr(0, p);
                let d = domains.find(d => d.code == domain);
                if (d) d.dataSets.push(ds)
            }
        });
        domains = domains.filter(d => d.dataSets.length);
        domains.forEach(d => {
            d.dataSets.sort((d1, d2) => d1.name > d2.name?1:-1)
        })
        return domains;
    }
}