function Flight(map, svg) {
    this.map = map,
    this.svg = svg, 
    this.curZoom = this.map.getZoom() // 返回地图此时的缩放级别
    this.beginPoint = { // 起点
        lat: 0,
        lng: 0
    }
     this.endPoint = { // 终点
        lat: 0,
        lng: 0
    }
    this.bp_px = null
    this.ep_px = null
    this.mp_px = null
    this.group = null
    this.bp_circle = null // 起点圆形标记
    this.ep_circle = null // 终点圆形标记
    this.radius = 6 * this.curZoom / 3 // 根据缩放级别计算标记的大小
    this.plane = null
    this.pos_plane = { // 飞机位置（像素坐标）
        x: 0,
        y: 0
    }
    this.w_plane = 64 // 飞机宽度
    this.h_plane = 64 // 飞机高度
    this.spos = 0
    this.rot = 0
    this.midPoint = {
        lat: 0,
        lng: 0
    }
    this.road = null
    this.road_points = null
    this.group_road = null
    this.clipPath = null
    this.clipPath_rect = null
    this.planeColor = "white" // 飞机颜色
    this.roadColor = "white"  // 航线颜色
    this.beginColor = "blue"  // 起点颜色
    this.endColor = "red"     // 终点颜色
    this.isCleaning = false
    this.planeInterval = null
    this._latlngs = []
    this.planeInfo = null

    /**
     * 飞机初始化
     *
     * @param {*} a 起点经纬度坐标
     * @param {*} b 终点经纬度坐标
     */
    // 2019-7-1
    // this.init = function (a, b) {
    this.init = function (latlngs, options, planeInfo) {
      this._latlngs = latlngs.map(function(e, index) {
        return L.latLng(e);
      });
      console.log("■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■");
      console.log("latlngs",latlngs);
      console.log("options",options);
      console.log("■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■");
      // 颜色
      this.planeColor = options.planeColor;
      this.roadColor = options.roadColor;
      this.beginColor = options.beginColor;
      this.endColor = options.endColor;
      this.planeInfo = planeInfo;


      this.beginPoint.lat = this._latlngs[0].lat // 起点经度
      this.beginPoint.lng = this._latlngs[0].lng // 起点纬度
      this.bp_px = this.map.latLngToLayerPoint([this._latlngs[0].lat, this._latlngs[0].lng]) // 把地理坐标转化为像素坐标
      this.endPoint.lat = this._latlngs[1].lat // 终点经度
      this.endPoint.lng = this._latlngs[1].lng // 终点纬度
      this.ep_px = this.map.latLngToLayerPoint([this._latlngs[1].lat, this._latlngs[1].lng])
      // 把起点像素坐标赋值给飞机像素坐标位置
      this.pos_plane.x = this.bp_px.x
      this.pos_plane.y = this.bp_px.y;

      this.group = this.svg.append("g")

      // 航线数组
      this.road_points = [
        [this.bp_px.x, this.bp_px.y],
        [this.ep_px.x, this.ep_px.y]
      ]
      
      this.clipPath = this.group.append("defs").append("clipPath").attr("id", "aaa").attr("clip-rule", "evenodd");

      var clipRectArr = this.getClipRect(this.bp_px, this.mp_px, this.pos_plane);
      // 矩形
      this.clipPath_rect = this.clipPath.append("rect").attr("x", clipRectArr[0]).attr("y", clipRectArr[1]).attr("width", clipRectArr[2]).attr("height", clipRectArr[3]);

      // 航线 group
      this.group_road = this.group.append("g").attr("class", "road");
      this.group_road.attr("clip-path", "url(#aaa)");
      // 绘制航线
      this.road = this.group_road.append("path")
        .datum(this.road_points) // 航线数组数据
        .attr("stroke", this.roadColor)
        .attr("stroke-width", 1.5)
        // .attr("stroke-dasharray", "10 5") // 虚线
        .attr("fill", "none")
        .attr("d", d3.line().curve(d3.curveBundle.beta(.5))); // 曲线  // 矫正系数

      this.bp_circle = this.group.append("circle").attr("fill", this.beginColor); // 起点标记
      this.ep_circle = this.group.append("circle").attr("fill", this.endColor); // 终点标记
      this.load_plane()

    }
    /**
     * 获取航线飞行的区域
     *
     * @param {*} bp_px // 起点的像素坐标
     * @param {*} mp_px // 中转点的像素坐标
     * @param {*} pos_plane // 飞机位置的像素坐标
     * @returns [矩形横坐标，矩形纵坐标，矩形宽度，矩形高度]
     */
    this.getClipRect = function (bp_px, mp_px, pos_plane) {
        var minX, minY, maxX, maxY, h, i;
        minX = Math.min(bp_px.x, pos_plane.x); // 起点横坐标和飞机横坐标求最小值
        minY = Math.min(bp_px.y, pos_plane.y); // 起点纵坐标和飞机纵坐标求最小值
        maxX = Math.max(bp_px.x, pos_plane.x);  // 起点横坐标和飞机横坐标求最大值
        maxY = Math.max(bp_px.y, pos_plane.y);  // 起点纵坐标和飞机纵坐标求最大值
        // 终点横坐标 - 起点横坐标的绝对值 是否大于等于  终点纵坐标 - 起点纵坐标的绝对值
        Math.abs(this.ep_px.x - this.bp_px.x) >= Math.abs(this.ep_px.y - this.bp_px.y) 
        ? (h = 0, i = 800) : (h = 800, i = 0);
        return [minX - h, minY - i, maxX - minX + 2 * h, maxY - minY + 2 * i]
    }
    /**
     * 绘制飞机
     *
     */
    this.load_plane = function () {
        var a = this.w_plane,
          b = this.h_plane,
          c = this.pos_plane.x,
          d = this.pos_plane.y,
          e = this.spos + 0.01,

          f = this.road.node().getTotalLength(), // 以用户坐标返回计算后的路径长度
          g = this.road.node().getPointAtLength(e * f), // 返回以用户坐标计算的距离起点distance单位的点，包含x和y属性
          // h = Victor(g.x - c.x, g.y - c.y).angleDeg();
          h = Victor(g.x - c, g.y - d).angleDeg(); // 生成角度
        this.rot = h + 45;
        this.plane = this.group.append("g").attr("id", "plane").attr("transform", function () {
          
            var e = "translate(" + c + "," + d + ")", f = "rotate(" + h + ")", g = "scale(0)", i = "translate(" + a / -2 + "," + b / -2 + ")";
            return e + f + g + i
        }).attr("fill", this.planeColor), this.plane.append("path").attr("d", this.d_plane)
        var that = this
        d3.select("#plane").data(that.planeInfo) // 绑定事件
        .on("mouseover", mouseOver).on("mouseout", mouseOut);
        this.map.on("zoomend", function () {
          that.update()
          that.render()
        })
        this.planeInterval = setInterval(function () {
          if(that.isEnd()) {
            clearInterval(that.planeInterval)
          }
            that.update()
            that.render()
        }, 100)   
    }
    /**
     *
     * 渲染
     */
    this.render = function () {
        var a = this.getClipRect(this.bp_px, this.mp_px, this.pos_plane);
        this.clipPath_rect.attr("x", a[0]).attr("y", a[1]).attr("width", a[2]).attr("height", a[3]);
        // 航线数组
        this.road_points = [
          [this.bp_px.x, this.bp_px.y],
          [this.ep_px.x, this.ep_px.y]
        ]
        this.road.datum(this.road_points).attr("d", d3.line().curve(d3.curveBundle.beta(.5)));

        // 绘制起点终点标记
        this.bp_circle.attr("cx", this.bp_px.x).attr("cy", this.bp_px.y).attr("r", this.radius);
        this.ep_circle.attr("cx", this.ep_px.x).attr("cy", this.ep_px.y).attr("r", this.radius);

        var b = this.w_plane, 
          c = this.h_plane, 
          d = this.pos_plane.x, 
          e = this.pos_plane.y, 
          f = this.rot, 
          g = this.spos, 
          h = d3.scaleLinear().domain([0, .9, 1]).range([.3, .5, 0]);
          this.plane.attr("transform", function () {
            // var a = "translate(" + d + "," + e + ")", i = "rotate(" + f + ")", j = "scale(" + h(g) + ")", k = "translate(" + b / -2 + "," + c / -2 + ")";
            var a = "translate(" + d + "," + e + ")", i = "rotate(" + f + ")", j = "scale(0.4)", k = "translate(" + b / -2 + "," + c / -2 + ")";
            return a + i + j + k
        })
    }
    /**
     * 更新飞机状态
     *
     */
    this.update = function () {
        this.curZoom = this.map.getZoom();
        this.radius = 6 * this.curZoom / 3;
        this.bp_px = this.map.latLngToLayerPoint([this.beginPoint.lat, this.beginPoint.lng]);
        this.ep_px = this.map.latLngToLayerPoint([this.endPoint.lat, this.endPoint.lng]);

        this.road_points = [
          [this.bp_px.x, this.bp_px.y],
          [this.ep_px.x, this.ep_px.y]
        ]
        this.road.datum(this.road_points).attr("d", d3.line().curve(d3.curveBundle.beta(.5)));

        this.spos = this.spos <= 1 ? this.spos + .01 : this.spos;
        var a = this.road.node().getTotalLength(), 
            b = this.road.node().getPointAtLength(this.spos * a);

        this.pos_plane.x = b.x; // 更新飞机位置
        this.pos_plane.y = b.y;

        var c = this.spos <= 1 ? this.spos + .01 : this.spos, 
            d = this.road.node().getPointAtLength(c * a), 
            e = Victor(d.x - this.pos_plane.x, d.y - this.pos_plane.y).angleDeg();
        this.rot = this.isEnd() ? 0 : e + 45
    }
    this.setPlaneColor = function (a) {
        this.planeColor = a;
        this.plane && this.plane.attr("fill", a)
    }
    this.setRoadColor = function (a) {
        this.roadColor = a;
        this.road && this.road.attr("stroke", a)
    }
    this.setBeginColor = function (a) {
        this.beginColor = a;
        this.bp_circle && this.bp_circle.attr("fill", a)
    }
    this.setEndColor = function (a) {
        this.endColor = a;
        this.ep_circle && this.ep_circle.attr("fill", this.endColor)
    }
    this.isEnd = function () {
        return Math.abs(this.spos - 1) < 1e-4 // 0.0001
    }
    /**
     *清楚起点终点标记和航线
     *
     */
    this.delete = function () {
        // this.bp_circle.transition().duration(500).style("opacity", "0.0").attr("r", 0).remove();
        // this.road.transition().duration(1e3).style("opacity", "0.0").attr("stroke-width", 0).remove();
        // this.ep_circle.transition().duration(1500).style("opacity", "0.0").attr("r", 0).remove();
        // this.group.transition().delay(1500).style("opacity", "0.0").remove()
    }
    this.d_plane = "M59.79,12.92C62.42,9.4,64,5.75,64,3.15a3.62,3.62,0,0,0-.49-2,1.6,1.6,0,0,0-.29-.37,1.68,1.68,0,0,0-.34-.27,3.56,3.56,0,0,0-2-.51c-2.6,0-6.25,1.58-9.77,4.21-2.84,2.13-5.69,5.12-9.62,9.27L39.34,15.7l-7.62-2.28,0,0a1.71,1.71,0,0,0,0-2.41L30.36,9.61a1.71,1.71,0,0,0-1.21-.5,1.68,1.68,0,0,0-1.21.5l-2.06,2.06-1.09-.33a1.71,1.71,0,0,0-.14-2.25L23.27,7.7a1.71,1.71,0,0,0-1.21-.5,1.67,1.67,0,0,0-1.2.5L19,9.59,11.21,7.27a1.94,1.94,0,0,0-.55-.08,2.05,2.05,0,0,0-1.43.58L6.5,10.5A1.61,1.61,0,0,0,6,11.62,1.56,1.56,0,0,0,6.85,13l16.3,9.11a2.84,2.84,0,0,1,.4.3l4.65,4.65C23.85,31.66,20,36.09,17,40L16.15,41,3.54,39.86H3.32a2.33,2.33,0,0,0-1.56.65L.49,41.76A1.58,1.58,0,0,0,0,42.89a1.55,1.55,0,0,0,.92,1.43l8.87,4.21a2.07,2.07,0,0,1,.34.24l.74.73a5.38,5.38,0,0,0-.35,1.71,2.24,2.24,0,0,0,.62,1.63l0,0h0a2.25,2.25,0,0,0,1.63.61,5.43,5.43,0,0,0,1.69-.35l.75.75a2,2,0,0,1,.23.33l4.2,8.85a1.57,1.57,0,0,0,1.41.93h0a1.58,1.58,0,0,0,1.12-.47l1.3-1.31a2.32,2.32,0,0,0,.62-1.56c0-.07,0-.13,0-.16L23,47.85,24,47c3.86-3,8.3-6.9,12.87-11.24l4.65,4.66a2.49,2.49,0,0,1,.3.4L51,57.13a1.58,1.58,0,0,0,2.54.37l2.74-2.74a2.08,2.08,0,0,0,.56-1.43,2,2,0,0,0-.07-.54L54.41,45l1.89-1.89a1.71,1.71,0,0,0,0-2.41l-1.39-1.38a1.71,1.71,0,0,0-2.25-.14l-.32-1.09,2.06-2.06a1.72,1.72,0,0,0,.5-1.21,1.69,1.69,0,0,0-.5-1.2L53,32.27a1.71,1.71,0,0,0-2.42,0h0L48.3,24.65l2.25-2.14C54.68,18.59,57.67,15.76,59.79,12.92Z"
}


function tooltipHtml(d){	/* function to create html content string in tooltip div. */
  return "<h4>"+d.planeName+"</h4><table>"+
    "<tr><td>人数</td><td>"+(d.peopleCount)+"</td></tr>"+
    "<tr><td>飞行时间</td><td>"+(d.flightTime)+"</td></tr>"+
    "</table>";
}

function mouseOver(d){
  d3.select("#tooltip").transition().duration(200).style("opacity", .9);
  d3.select("#tooltip").html(tooltipHtml(d))
    .style("left", (d3.event.pageX) + "px")
    .style("top", (d3.event.pageY - 28) + "px");
}

function mouseOut(){
  d3.select("#tooltip").transition().duration(500).style("opacity", 0);
}