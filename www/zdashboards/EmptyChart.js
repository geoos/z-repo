class EmptyChart extends ZDashboardElement {
    get code() {return "empty"}
    async refresh(start, end) {}
}
ZVC.export(EmptyChart);