var map;
var dates = {highres: [], dates: []}
var values = {highres: [], max: [], mean: [], min: [], std_dev_range_lower: [], std_dev_range_upper: []};
var returnShapes;

    require([
    "esri/map", "esri/layers/ArcGISDynamicMapServiceLayer","dojo/on","dojo/ready", "esri/InfoTemplate",
    "esri/TimeExtent","esri/dijit/Legend", "esri/dijit/TimeSlider", "esri/InfoTemplate", "esri/request", "esri/config",
    "dojo/_base/array", "dojo/dom", "dojo/domReady!"
], function (
    Map, ArcGISDynamicMapServiceLayer,on,ready, InfoTemplate, TimeExtent, Legend, TimeSlider,
    InfoTemplate, esriRequest, esriConfig, arrayUtils, dom
) {

    esriConfig.defaults.io.corsEnabledServers.push("tethys.byu.edu");
    esriConfig.defaults.io.corsEnabledServers.push("ai4e-arcserver.byu.edu")
var     loading = dom.byId("loadingImg");  //create loading image

        map = new Map("mapDiv", {
        basemap: "gray",
        center: [0, 15],
        zoom: 3
    });
        showLoading;




    var infoTemplate = new InfoTemplate() //creates popup box
    map.infoWindow.resize(850, 600);
    map.infoWindow.anchor = "ANCHOR_UPPERRIGHT"
    map.infoWindow.reposition();
    infoTemplate.setTitle("Global Streamflow Forecasting");
    infoTemplate.setContent(getstreamflow);

    function getstreamflow(graphic) {
        var watershed = graphic.attributes.watershed;
        var subbasin = graphic.attributes.subbasin;
        var comid = graphic.attributes.comid;
        var layerUrl = "https://tethys.byu.edu/apps/streamflow-prediction-tool/api/GetForecast/?watershed_name=" + watershed + "&subbasin_name=" + subbasin + "&reach_id=" + comid + "&forecast_folder=most_recent&return_format=csv";
      //  esriConfig.defaults.io.corsEnabledServers.push("tethys.byu.edu"); // redundant
        $.ajax({
            type: 'GET',
            url: layerUrl,
            dataType: 'text',
            contentType: "text/plain",
            headers: {
                'Authorization': "Token 2d03550b3b32cdfd03a0c876feda690d1d15ad40"
            },
            success: function(data) {
                if ($('#graph').length) {
                    Plotly.purge('graph');
                    $('#graph').remove();
                };

                $('div .contentPane').append('<div id="graph"></div>');
                var allLines = data.split('\n');
                var headers = allLines[0].split(',');

                for (var i=1; i < allLines.length; i++) {
                    var data = allLines[i].split(',');

                    if (headers.includes('high_res (m3/s)')) {
                        dates.highres.push(data[0]);
                        values.highres.push(data[1]);

                        if (data[2] !== 'nan') {
                            dates.dates.push(data[0]);
                            values.max.push(data[2]);
                            values.mean.push(data[3]);
                            values.min.push(data[4]);
                            values.std_dev_range_lower.push(data[5]);
                            values.std_dev_range_upper.push(data[6]);
                        }
                    } else {
                        dates.dates.push(data[0]);
                        values.max.push(data[1]);
                        values.mean.push(data[2]);
                        values.min.push(data[3]);
                        values.std_dev_range_lower.push(data[4]);
                        values.std_dev_range_upper.push(data[5]);
                    }
                }
            },
            complete: function() {
                var mean = {
                    name: 'Mean',
                    x: dates.dates,
                    y: values.mean,
                    mode: "lines",
                    line: {color: 'blue'}
                };

                var max = {
                    name: 'Max',
                    x: dates.dates,
                    y: values.max,
                    fill: 'tonexty',
                    mode: "lines",
                    line: {color: 'rgb(152, 251, 152)', width: 0}
                };

                var min = {
                    name: 'Min',
                    x: dates.dates,
                    y: values.min,
                    fill: 'none',
                    mode: "lines",
                    line: {color: 'rgb(152, 251, 152)'}
                };

                var std_dev_lower = {
                    name: 'Std. Dev. Lower',
                    x: dates.dates,
                    y: values.std_dev_range_lower,
                    fill: 'tonexty',
                    mode: "lines",
                    line: {color: 'rgb(152, 251, 152)', width: 0}
                };

                var std_dev_upper = {
                    name: 'Std. Dev. Upper',
                    x: dates.dates,
                    y: values.std_dev_range_upper,
                    fill: 'tonexty',
                    mode: "lines",
                    line: {color: 'rgb(152, 251, 152)', width: 0}
                };

                var data = [min, max, std_dev_lower, std_dev_upper, mean];

                if(values.highres.length > 0) {
                    var highres = {
                        name: 'HRES',
                        x: dates.highres,
                        y: values.highres,
                        mode: "lines",
                        line: {color: 'black'}
                    };

                    data.push(highres)
                }

                var layout = {
                    title: titleCase(watershed) + ' Forecast<br>Reach ID: ' + comid,
                    xaxis: {title: 'Date'},
                    yaxis: {title: 'Streamflow m3/s', range: [0, Math.max(...values.max) + Math.max(...values.max)/5]},
                    //shapes: returnShapes,
                }

                Plotly.newPlot('graph', data, layout);

                var index = dates.dates.length - 2;
                console.log(index);
                getreturnperiods(dates.dates[0], dates.dates[index], watershed, subbasin, comid);


                dates.highres = [], dates.dates = [];
                values.highres = [], values.max = [], values.mean = [], values.min = [], values.std_dev_range_lower = [], values.std_dev_range_upper = [];
            }

        });;

        return
    };//popup box insides

    function getreturnperiods(start, end, watershed, subbasin, comid) {
        var layerUrl = "https://tethys.byu.edu/apps/streamflow-prediction-tool/api/GetReturnPeriods/?watershed_name=" + watershed + "&subbasin_name=" + subbasin + "&reach_id=" + comid;
        esriConfig.defaults.io.corsEnabledServers.push("tethys.byu.edu");
        $.ajax({
            type: 'GET',
            url: layerUrl,
            dataType: 'text',
            contentType: "text/plain",
            headers: {
                'Authorization': "Token 2d03550b3b32cdfd03a0c876feda690d1d15ad40"
            },
            success: function (data) {
                var returnPeriods = JSON.parse(data);

                var return_max = parseFloat(returnPeriods["max"]);
                var return_20 = parseFloat(returnPeriods["twenty"]);
                var return_10 = parseFloat(returnPeriods["ten"]);
                var return_2 = parseFloat(returnPeriods["two"]);

                var band_alt_max = -9999

                var shapes = [{
                    type: 'rect',
                    layer: 'below',
                    xref: 'x',
                    yref: 'y',
                    x0: start,
                    y0: return_20,
                    x1: end,
                    y1: Math.max(return_max, band_alt_max),
                    line: {width: 0},
                    fillcolor: 'rgba(128, 0, 128, 0.4)'
                },
                    // return 10 band
                    {
                        type: 'rect',
                        layer: 'below',
                        xref: 'x',
                        yref: 'y',
                        x0: start,
                        y0: return_10,
                        x1: end,
                        y1: return_20,
                        line: {width: 0},
                        fillcolor: 'rgba(255, 0, 0, 0.4)'
                    },
                    // return 2 band
                    {
                        type: 'rect',
                        layer: 'below',
                        xref: 'x',
                        yref: 'y',
                        x0: start,
                        y0: return_2,
                        x1: end,
                        y1: return_10,
                        line: {width:0},
                        fillcolor: 'rgba(255, 255, 0, 0.4)'
                    }];

                passShape(shapes);

                //var annotations = [
                //// return max
                //{
                //    x: datetime_end,
                //    y: return_max,
                //    xref: 'x',
                //    yref: 'y',
                //    text: 'Max. ({:.1f})'.format(return_max),
                //    showarrow: False,
                //    xanchor: 'left'
                //},
                //// return 20 band
                //{
                //    x: datetime_end,
                //    y: return_20,
                //    xref: 'x',
                //    yref: 'y',
                //    text: '20-yr ({:.1f})'.format(return_20),
                //    showarrow: False,
                //    xanchor: 'left'
                //},
                //// return 10 band
                //{
                //    x: datetime_end,
                //    y: return_10,
                //    xref: 'x',
                //    yref: 'y',
                //    text: '10-yr ({:.1f})'.format(return_10),
                //    showarrow: False,
                //    xanchor: 'left'
                //},
                //// return 2 band
                //{
                //    x: datetime_end,
                //    y: return_2,
                //    xref: 'x',
                //    yref: 'y',
                //    text: '2-yr ({:.1f})'.format(return_2),
                //    showarrow: False,
                //    xanchor: 'left'
                //}];
            }
        })
    };// create boxes for graph

    function passShape(shapes) {
        var update = {
            shapes: shapes,
        };
        Plotly.relayout('graph', update);
    }

    function titleCase(str) {
        str = str.toLowerCase();
        str = str.split('_');

        for (var i = 0; i < str.length; i++) {
            str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
        }

        return str.join(' ');
    };

    var southAsiaTemplate = {
        1: {
            infoTemplate: infoTemplate,
            layerUrl: "http://ai4e-arcserver.byu.edu/arcgis/rest/services/global/south_asia/MapServer/1"
        }
    };

    var southAmericaTemplate = {
        1: {
            infoTemplate: infoTemplate,
            layerUrl: "http://ai4e-arcserver.byu.edu/arcgis/rest/services/global/south_america/MapServer/1"
        }
    };

    var africaTemplate = {
        1: {
            infoTemplate: infoTemplate,
            layerUrl: "http://ai4e-arcserver.byu.edu/arcgis/rest/services/global/africa/MapServer/1"
        }
    };

    var northAmericaTemplate = {
        1: {
            infoTemplate: infoTemplate,
            layerUrl: "http://ai4e-arcserver.byu.edu/arcgis/rest/services/global/north_america/MapServer/1"
        }
    };

    var asiaTemplate = {
        1: {
            infoTemplate: infoTemplate,
            layerUrl: "http://ai4e-arcserver.byu.edu/arcgis/rest/services/global/asia/MapServer/1"
        }
    };

    var southAsiaLyr = new ArcGISDynamicMapServiceLayer("http://ai4e-arcserver.byu.edu/arcgis/rest/services/global/south_asia/MapServer",{
        infoTemplates: southAsiaTemplate,
    });

    var southAmericaLyr = new ArcGISDynamicMapServiceLayer("http://ai4e-arcserver.byu.edu/arcgis/rest/services/global/south_america/MapServer",{
        infoTemplates: southAmericaTemplate,
    });

    var africaLyr = new ArcGISDynamicMapServiceLayer("http://ai4e-arcserver.byu.edu/arcgis/rest/services/global/africa/MapServer",{
        infoTemplates: africaTemplate,
    });

    var northAmericaLyr = new ArcGISDynamicMapServiceLayer("http://ai4e-arcserver.byu.edu/arcgis/rest/services/global/north_america/MapServer",{
        infoTemplates: northAmericaTemplate,
    });

    var asiaLyr = new ArcGISDynamicMapServiceLayer("http://ai4e-arcserver.byu.edu/arcgis/rest/services/global/asia/MapServer",{
        infoTemplates: asiaTemplate,
    });


    //apply a definition expression so only some features are shown
    var layerDefinitions = [];
    southAsiaLyr.setLayerDefinitions(layerDefinitions);
    southAmericaLyr.setLayerDefinitions(layerDefinitions);
    africaLyr.setLayerDefinitions(layerDefinitions);
    northAmericaLyr.setLayerDefinitions(layerDefinitions);
    asiaLyr.setLayerDefinitions(layerDefinitions);

    //add the gas fields layer to the map
    map.addLayers([southAsiaLyr, southAmericaLyr, africaLyr, northAmericaLyr, asiaLyr]);

        map.on("load", function(evt){

         //   console.log(northAmericaLyr.getAttributionData())
            var namechange=northAmericaLyr.layerInfos;
        //    namechange['0'].name="Stream flow";//only works sometimes
          //  console.log(namechange);



//        console.log(northAmericaLyr.layerInfos[0].name)
            northAmericaLyr.name="name";
            var legend = new Legend({
                map: map,
                layerInfos: [{
                    layer: northAmericaLyr,
                    title: "Legend",
                }]
            }, "legendDiv");

            legend.startup();

        });//legend

    map.on("layers-add-result", initSlider);




    function initSlider() {
        var timeSlider = new TimeSlider({
            style: "width: 100%;"
        }, dom.byId("timeSliderDiv"));
        map.setTimeSlider(timeSlider);

        var jsonobject = "http://ai4e-arcserver.byu.edu/arcgis/rest/services/global/south_asia/MapServer?f=pjson"


        $.getJSON(jsonobject, function(data) {
            textents = data.timeInfo.timeExtent
            tinterval = data.timeInfo.defaultTimeInterval

            var timeExtent = new TimeExtent();
            timeExtent.startTime = new Date(textents[0]);
            timeExtent.endTime = new Date(textents[1]);
console.log(timeExtent);
            console.log(timeExtent.startTime+"    "+timeExtent.endTime);
            console.log(textents);
            timeSlider.setThumbCount(2);
            timeSlider.createTimeStopsByTimeInterval(timeExtent, 3, "esriTimeUnitsHours");
            timeSlider.setThumbIndexes([0,0]);
            timeSlider.setThumbMovingRate(1500);
            timeSlider.startup();
        });

        timeSlider.on("time-extent-change", function(evt) {
            var endValString = evt.endTime;
            var startValString = evt.startTime;
            evt.startTime = evt.endTime;
            var ampm='am';
            var date=JSON.stringify(startValString).slice(1,24);
            var timearray=date.split("T");
            date=timearray[0];
            timearray=timearray[1].split(":");
            /*  if(timearray[0]>=12)
              {
                  timearray[0]=timearray[0]-12;
                  ampm='pm';
              } else{
                 timearray[0]=parseInt(timearray[0],10);
              }
              if(timearray[0]==0){
                  timearray[0]=12;
              }*/
            date=date+" "+timearray[0]+":"+timearray[1]/*+" "+ampm*/;
            dom.byId("slidercap").innerHTML = "<i>" + date + "<\/i>";
        });
    }//bottom ribbion


        on(map, "update-end", hideLoading);
        function showLoading() {
            esri.show(loading);
            map.disableMapNavigation();
            map.hideZoomSlider();
        }

        function hideLoading(error) {
            esri.hide(loading);
            map.enableMapNavigation();
            map.showZoomSlider();
        }

});
