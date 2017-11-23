var canwrite = true;

var mode = 'view'; //modes: route, view

var pin_icon = 'pin_32.png';
var start_pin_icon = 'start_pin_32.png';
var list_icon = 'list_32.png';
var start_icon = 'checkered_32.png';
var route_icon = 'route_32.png';
var poi_icon = 'poi_32.png';
var routing_pin_icon = 'routing_pin_32.png';
var route_pin_icon = 'route_pin_32.png';
var poi_pin_icon = 'poi_pin_32.png';
var exit_icon = 'exit_32.png';
var edit_icon = 'edit_32.png';
var delete_icon = 'delete_32.png';

var start = [];
var routes = [];
var pois = [];
var routing_points = [];
var curr_route = null;
var trip_line = null;
var alt_trip_line = null;

var json_save = new Object;

var url_osrm_nearest = 'https://mekapaedia.com:5001/nearest/v1/driving/';
var url_osrm_route = 'https://mekapaedia.com:5001/route/v1/driving/';
var url_osrm_trip = 'https://mekapaedia.com:5001/trip/v1/driving/';
var url_save = 'saver.cgi';
var url_get = 'getter.cgi';

var startup = true;

function save_state() {
	if (startup === true || canwrite === false) {
		return;
	}
	json_save = new Object;
	json_save.start = [];
	json_save.start.push();
	json_save.startname = start.name;
	json_save.routes = [];
	json_save.routenames = [];
	json_save.routes_markernames = [];
	json_save.routing_points = [];
	json_save.routing_points_names = [];
	json_save.pois = [];
	json_save.pois_names = [];
	json_save.start[0] = start.coord;
	routes.forEach(function (ele) {
		json_save.routenames.push(ele.name);
		json_save.routes_markernames.push([]);
		json_save.routes.push([]);
		ele.coords.forEach(function (ele2) {
			json_save.routes[json_save.routes.length - 1].push(ele2.coord)
			json_save.routes_markernames[json_save.routes_markernames.length - 1].push(ele2.name);
		});
	});
	routing_points.forEach(function (ele) {
		json_save.routing_points.push(ele.coord);
		json_save.routing_points_names.push(ele.name);
	});
	pois.forEach(function (ele) {
		json_save.pois.push(ele.coord);
		json_save.pois[json_save.pois.length - 1].name = ele.name;
		json_save.pois_names.push(ele.name);
	});
	json_string = JSON.stringify(json_save);
	console.log(json_string);
	var http = new XMLHttpRequest();
	var url = url_save;
	http.open("POST", url, true);
	http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	http.send(json_string);
}

function get_state() {
	startup = true;
	var http = new XMLHttpRequest();
	var url = url_get + "?please=yes";
	http.open("GET", url, true);
	http.onreadystatechange = function () {
		if (http.readyState == XMLHttpRequest.DONE) {
			json_save = JSON.parse(http.responseText);
			console.log(json_save);
			place_marker(json_save.start[0], "start", json_save.startname);
			var poinum = 0;
			json_save.pois.forEach(function (ele) {
				place_marker(ele, "poi", json_save.pois_names[poinum]);
				poinum++;
			});
			var route_point = 0;
			json_save.routing_points.forEach(function (ele) {
				place_marker(ele, "routing_point", json_save.routing_points_names[route_point]);
				route_point++;
			});
			var routenum = 0;
			json_save.routes.forEach(function (ele) {
				add_route(null, null, json_save.routenames[routenum]);
				var markernum = 0;
				ele.forEach(function (ele2) {
					place_marker(ele2, "route_point", json_save.routes_markernames[routenum][markernum]);
					markernum++;
				});
				routenum++;
				exit_route();
			});
			startup = false;
		}
	}
	http.send(null);
}

get_state();


var vectorSource = new ol.source.Vector();
var vectorLayer = new ol.layer.Vector({
		source: vectorSource
	});

	
function start_style()
{
	return [
    new ol.style.Style({
		image: new ol.style.Icon({
			src: start_pin_icon,
			scale: 1,
			anchor: [.5, 1]
		}),
      text: new ol.style.Text({
        font: '12px Calibri,sans-serif',
        fill: new ol.style.Fill({ color: '#000' }),
        stroke: new ol.style.Stroke({
          color: '#fff', width: 2
        }),
        text: this.get("order")
      })
    })
  ];
}

function routing_style()
{
	return [
    new ol.style.Style({
		image: new ol.style.Icon({
			src: routing_pin_icon,
			scale: 1,
			anchor: [.5, 1]
		}),
      text: new ol.style.Text({
        font: '12px Calibri,sans-serif',
        fill: new ol.style.Fill({ color: '#000' }),
        stroke: new ol.style.Stroke({
          color: '#fff', width: 2
        }),
        text: this.get("order")
      })
    })
  ];
}

function route_style()
{
	return [
    new ol.style.Style({
		image: new ol.style.Icon({
			src: route_pin_icon,
			scale: 1,
			anchor: [.5, 1]
		}),
      text: new ol.style.Text({
        font: '12px Calibri,sans-serif',
        fill: new ol.style.Fill({ color: '#000' }),
        stroke: new ol.style.Stroke({
          color: '#fff', width: 2
        }),
        text: this.get("order")
      })
    })
  ];
}

function poi_style()
{
	return [
    new ol.style.Style({
		image: new ol.style.Icon({
			src: poi_pin_icon,
			scale: 1,
			anchor: [.5, 1]
		}),
      text: new ol.style.Text({
        font: '12px Calibri,sans-serif',
        fill: new ol.style.Fill({ color: '#000' }),
        stroke: new ol.style.Stroke({
          color: '#fff', width: 2
        }),
        text: this.get("order")
      })
    })
  ];
}

var line_styles = {
	route: new ol.style.Style({
		stroke: new ol.style.Stroke({
			width: 6,
			color: [45, 107, 206, .8]
		})
	}),
	trip: new ol.style.Style({
		stroke: new ol.style.Stroke({
			width: 6,
			color: [0, 0, 0, .7]
		})
	})
};

function find_route_by_feature(feature) {
	found_route = null
		routes.forEach(function (ele) {
			if (ele.route === feature) {
				found_route = ele;
			}
			ele.coords.forEach(function (ele2) {
				if (ele2.feature === feature) {
					found_route = ele;
				}
			});
		});
	return found_route;
}

var start_drag_interaction = [];

var map = new ol.Map({
		target: 'map',
		layers: [
			new ol.layer.Tile({
				source: new ol.source.OSM({
					crossOrigin: null
				})
			}),
			vectorLayer
		],
		loadTilesWhileAnimating: true,
		loadTilesWhileInteracting: true,
		view: new ol.View({
			center: [0, 0],
			zoom: 5
		}),
		controls: []
	});

      var styleFunction = function(feature) {
        var geometry = this.getGeometry();
        var styles = [
          // linestring
          new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: '#ffcc33',
              width: 2
            })
          })
        ];
		if(map.zoom > 10)
		{
        geometry.forEachSegment(function(start, end) {
          var dx = end[0] - start[0];
          var dy = end[1] - start[1];
          var rotation = Math.atan2(dy, dx);
          // arrows
          styles.push(new ol.style.Style({
            geometry: new ol.geom.Point(end),
            image: new ol.style.Icon({
              src: 'https://openlayers.org/en/v4.5.0/examples/data/arrow.png',
              anchor: [0.75, 0.5],
              rotateWithView: true,
              rotation: -rotation
            })
          }));
        });
		}
        return styles;
      };

if (typeof(Storage) !== "undefined") {
	if (localStorage.position) {
		posarr = localStorage.position.split(",");
		zoomval = parseFloat(localStorage.zoom);
		longcoord = parseFloat(posarr[0]);
		latcoord = parseFloat(posarr[1]);
		map.getView().setCenter([longcoord, latcoord]);
		map.getView().setZoom(zoomval);
	} else {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function (position) {
				map.getView().setCenter(ol.proj.transform([position.coords.longitude, position.coords.latitude], 'EPSG:4326', 'EPSG:3857'));
			});

		}
	}
} else {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function (position) {
			map.getView().setCenter(ol.proj.transform([position.coords.longitude, position.coords.latitude], 'EPSG:4326', 'EPSG:3857'));
		});

	}
}

function set_start(obj) {
	var coord4326 = ol.proj.transform(obj.coordinate, 'EPSG:3857', 'EPSG:4326');
	var coordnearest = get_nearest(coord4326, place_marker, 'start');
};

function place_marker(coord, type, name) {
	if (coord !== null) {
		var point = [];
		var array = [];
		if (startup !== true && (name === undefined || name === null || name === "")) {
			name = prompt("Name for this marker", "Unnamed");
		}
		if (name === null) {
			return;
		} else if (name === "" || name === undefined) {
			name = "Unnamed";
		}
		point.coord = coord;
		feature = new ol.Feature({
				type: 'marker',
				geometry: new ol.geom.Point(ol.proj.fromLonLat(coord)),
				point: point
			});
		var style = [];
		if (type === 'start') {
			feature.setId("start");
			feature.set('order', "start");
			map.removeInteraction(start.interaction);
			style = start_style;
		} else if (type === 'routing_point') {
			style = routing_style;
			feature.set('order', "");
			array = routing_points;
		} else if (type === 'route_point') {
			style = route_style;
			feature.set('order', "");
			array = curr_route.coords;
		} else if (type === 'poi') {
			style = poi_style;
			feature.set('order', "");
			array = pois;
		}
		point.feature = feature;
		point.name = name;
		feature.setStyle(style);

		var drag_interaction = new ol.interaction.Modify({
				features: new ol.Collection([feature]),
				style: null
			});
		point.interaction = drag_interaction;
		drag_interaction.on('modifyend', function () {
			get_nearest(ol.proj.transform(this.getGeometry().getCoordinates(), 'EPSG:3857', 'EPSG:4326'), move_coord, type, point.feature)
		}, point.feature);
		if (canwrite === true) {
			map.addInteraction(drag_interaction);
		}

		if (type === 'start') {
			start = point;
			var old_feature = vectorSource.getFeatureById("start");
			if (old_feature === null) {
				vectorSource.addFeature(feature);
			} else {
				vectorSource.removeFeature(old_feature);
				vectorSource.addFeature(feature);
			}

		} else {
			vectorSource.addFeature(feature);
			array.push(point);
			if (type === 'route_point') {
				if (vectorSource.getFeatures().indexOf(curr_route.route) > -1) {
					vectorSource.removeFeature(curr_route.route);
				}
				get_route(curr_route.coords, null, curr_route);
			}
		}
		if (mode !== 'route') {
			alt_trip();
			//update_trip();
		}
	}
	if (startup !== true) {
		save_state();
	}
}

function update_trip() {
	if (trip_line) {
		vectorSource.removeFeature(trip_line);
		trip_line = null;
	}
	if (start.coord) {
		var trip_list = [];
		trip_list.push(start.coord.join(","));
		pois.forEach(function (ele) {
			trip_list.push(ele.coord.join(","));
		});
		routing_points.forEach(function (ele) {
			trip_list.push(ele.coord.join(","));
		});
		routes.forEach(function (ele) {
			ele.coords.forEach(function (ele2) {
				trip_list.push(ele2.coord.join(","));
			});
		});
		if (trip_list.length > 1) {
			var trip_string = trip_list.join(";") + "?source=first&overview=full&steps=true";
			get_trip(trip_string);
		}
	}
}

function alt_trip(startup) {
	if (trip_line) {
		vectorSource.removeFeature(trip_line);
		trip_line = null;
	}
	if (start.coord) {
		var trip_list = [];
		trip_list.push(start.coord.join(","));
		pois.forEach(function (ele) {
			trip_list.push(ele.coord.join(","));
		});
		routing_points.forEach(function (ele) {
			trip_list.push(ele.coord.join(","));
		});
		routes.forEach(function (ele) {
			ele.coords.forEach(function (ele2) {
				trip_list.push(ele2.coord.join(","));
			});
		});
		if (trip_list.length > 1) {
			var trip_string = trip_list.join(";") + "?source=first&overview=full&steps=true";
			get_alt_trip(trip_string);
		}
	}
	if (startup !== true) {
		save_state();
	}
}

function move_coord(coord, type, feature) {
	var newpos = new ol.geom.Point(ol.proj.fromLonLat(coord));
	feature.setGeometry(newpos);
	feature.getProperties().point.coord = coord;
	route = find_route_by_feature(feature)
		if (route) {
			if (route.route) {
				vectorSource.removeFeature(route.route);
			}
			get_route(route.coords, null, route);
		}
		if (mode !== 'route') {
			alt_trip();
			//update_trip();
		}
		save_state();
};

function add_route(callback_obj1, callback_obj2, route_name) {
	if (startup !== true && (route_name === null || route_name === undefined || route_name === "")) {
		route_name = prompt("Name for this route", "Unnamed");
	} else if (route_name === undefined || route_name === "") {
		route_name = "Unnamed";
	}
	if (route_name === null) {
		return;
	}
	var trip_lines = vectorSource.getFeatures();
	trip_lines.forEach(function (ele) {
		if (ele.getProperties().type == 'trip') {
			vectorSource.removeFeature(ele);
			trip_line = null;
		}
	});
	mode = 'route';
	contextmenu.clear();
	contextmenu.extend(contextmenu_items_route);
	route = [];
	route.coords = [];
	route.route = new ol.Feature();
	console.log("arguments: ");
	console.log(arguments);
	route.name = route_name;
	curr_route = route;
	routes.push(route);
};
function exit_route() {
	mode = 'view';
	contextmenu.clear();
	contextmenu.extend(contextmenu_items_view);
	if (curr_route.coords.length <= 0) {
		routes.splice(routes.indexOf(curr_route), 1);
	}
	curr_route = null;
	alt_trip();
	//update_trip();
};
function add_point(obj) {
	var coord4326 = ol.proj.transform(obj.coordinate, 'EPSG:3857', 'EPSG:4326');
	var coordnearest = get_nearest(coord4326, place_marker, 'routing_point');
};
function add_route_point(obj) {
	var coord4326 = ol.proj.transform(obj.coordinate, 'EPSG:3857', 'EPSG:4326');
	var coordnearest = get_nearest(coord4326, place_marker, 'route_point');
};
function add_poi(obj) {
	var coord4326 = ol.proj.transform(obj.coordinate, 'EPSG:3857', 'EPSG:4326');
	var coordnearest = get_nearest(coord4326, place_marker, 'poi');
};
function delete_marker(obj) {
	var marker_to_delete = map.getFeaturesAtPixel(map.getPixelFromCoordinate(obj.coordinate))[0];
	if (marker_to_delete.getProperties().type === 'marker') {
		route = find_route_by_feature(marker_to_delete);
		pois.forEach(function (ele) {
			if (ele.feature === marker_to_delete) {
				map.removeInteraction(ele.interaction);
				pois.splice(pois.indexOf(ele), 1);
			}
		});
		routing_points.forEach(function (ele) {
			if (ele.feature === marker_to_delete) {
				map.removeInteraction(ele.interaction);
				routing_points.splice(routing_points.indexOf(ele), 1);
			}
		});
		routes.forEach(function (ele) {
			ele.coords.forEach(function (ele2) {
				if (ele2.feature === marker_to_delete) {
					map.removeInteraction(ele2.interaction);
					ele.coords.splice(ele.coords.indexOf(ele2), 1);
				}
			});
			if (ele.coords.length < 2 && mode === 'view') {
				map.removeInteraction(ele.coords[0].interaction);
				vectorSource.removeFeature(ele.coords[0].feature);
				routes.splice(routes.indexOf(ele), 1);
			}
		});
		if (start.feature === marker_to_delete) {
			start.coord = null;
			map.removeInteraction(start.interaction);
		}
		vectorSource.removeFeature(marker_to_delete);
		if (route) {
			if (route.route) {
				vectorSource.removeFeature(route.route);
			}
			get_route(route.coords, null, route);
		}
		if (mode !== 'route') {
			alt_trip();
			//update_trip();
		}

	}
	save_state();

}
function delete_route(obj) {
	var route_to_delete = find_route_by_feature(map.getFeaturesAtPixel(map.getPixelFromCoordinate(obj.coordinate))[0]);
	vectorSource.removeFeature(route_to_delete.route);
	route_to_delete.coords.forEach(function (ele) {
		vectorSource.removeFeature(ele.feature);
		map.removeInteraction(ele.interaction);
	});
	routes.splice(routes.indexOf(route_to_delete), 1);
	alt_trip();
	//update_trip();
	save_state();
}
function edit_route(obj) {
	var trip_lines = vectorSource.getFeatures();
	trip_lines.forEach(function (ele) {
		if (ele.getProperties().type == 'trip') {
			vectorSource.removeFeature(ele);
			trip_line = null;
		}
	});
	curr_route = find_route_by_feature(map.getFeaturesAtPixel(map.getPixelFromCoordinate(obj.coordinate))[0]);
	if (curr_route === null) {
		mode = 'view';
		contextmenu.clear();
		contextmenu.extend(contextmenu_items_view);
	} else {
		mode = 'route';
		contextmenu.clear();
		contextmenu.extend(contextmenu_items_route);
	}
}
var contextmenu_items_view = [{
		text: 'Set Start',
		icon: start_icon,
		callback: set_start
	}, {
		text: 'Add POI',
		icon: poi_icon,
		callback: add_poi
	}, {
		text: 'Add Route',
		icon: route_icon,
		callback: add_route
	}, {
		text: 'Add Routing Point',
		icon: pin_icon,
		callback: add_point
	}
];

var contextmenu_delete_marker = [{
		text: 'Delete marker',
		icon: delete_icon,
		callback: delete_marker
	},
];

var contextmenu_add_point = [{
		text: 'Add Routing Point',
		icon: pin_icon,
		callback: add_point
	}
];

var contextmenu_edit_route = [{
		text: 'Edit this route',
		icon: edit_icon,
		callback: edit_route
	},
];

var contextmenu_delete_route = [{
		text: 'Delete this route',
		icon: delete_icon,
		callback: delete_route
	}
];

function rename_feature(obj) {
	if (canwrite !== true) {
		return;
	}
	var feature = map.getFeaturesAtPixel(map.getPixelFromCoordinate(obj.coordinate))[0];
	var marker_to_rename = null;
	if (feature.getProperties().type === 'marker') {
		pois.forEach(function (ele) {
			if (ele.feature === feature) {
				marker_to_rename = ele;
			}
		});
		routing_points.forEach(function (ele) {
			if (ele.feature === feature) {
				marker_to_rename = ele;
			}
		});
		routes.forEach(function (ele) {
			ele.coords.forEach(function (ele2) {
				if (ele2.feature === feature) {
					marker_to_rename = ele2;
				}
			});
		});
		if (start.feature === feature) {
			marker_to_rename = start;
		}
	} else {
		return;
	}
	new_name = prompt("Enter a new name for the marker", marker_to_rename.name);
	if (new_name === null) {
		return;
	} else if (new_name === undefined || new_name === "") {
		new_name = "Unnamed";
	}
	marker_to_rename.name = new_name;
	save_state();
}
function rename_route(obj) {
	if (canwrite !== true) {
		return;
	}
	var route_to_rename = find_route_by_feature(map.getFeaturesAtPixel(map.getPixelFromCoordinate(obj.coordinate))[0]);
	new_name = prompt("Enter a new name for the route", route_to_rename.name);
	if (new_name === null) {
		return;
	} else if (new_name === undefined || new_name === "") {
		new_name = "Unnamed";
	}
	route_to_rename.name = new_name;
	save_state();
}

function list_arrays() {
	console.log("-")
	console.log(start);
	console.log(routes);
	console.log(pois);
	console.log(routing_points);
}

var contextmenu_items_route = [{
		text: 'Add Point',
		icon: pin_icon,
		callback: add_route_point
	}, {
		text: 'Finish editing route',
		icon: exit_icon,
		callback: exit_route
	},
];

var contextmenu = new ContextMenu({
		width: 180,
		items: contextmenu_items_view,
		defaultItems: false
	});

map.addControl(contextmenu);

map.on('moveend', function (e) {
	if (typeof(Storage) !== "undefined") {
		localStorage.position = map.getView().getCenter();
		localStorage.zoom = map.getView().getZoom();
	}
	map.getTargetElement().style.cursor = 'default';
});

map.on('pointermove', function (e) {

	if (e.dragging) {
		return;
	}

	var pixel = map.getEventPixel(e.originalEvent);
	var hit = map.hasFeatureAtPixel(pixel);

	if (hit) {
		map.getTargetElement().style.cursor = 'pointer';
	} else {
		map.getTargetElement().style.cursor = 'default';
	}

});

contextmenu.on('beforeopen', function (evt) {
	var feature = map.forEachFeatureAtPixel(evt.pixel, function (ft, l) {
			return ft;
		});

	var contextmenu_rename = [{
			text: "Unnamed",
			icon: edit_icon,
			callback: rename_feature
		},
	];

	var contextmenu_rename_route = [{
			text: "Unnamed",
			icon: edit_icon,
			callback: rename_route
		},
	];

	var found_route;
	if (feature && feature.getProperties().type !== "trip") {
		contextmenu.clear();
		found_route = find_route_by_feature(feature);
		if (found_route) {
			contextmenu_rename_route[0].text = found_route.name;
			contextmenu.extend(contextmenu_rename_route);
		}
		if (feature.getProperties().type === 'marker') {
			pois.forEach(function (ele) {
				if (ele.feature === feature) {
					if (ele.name !== null && ele.name !== undefined && ele.name !== "Unnamed") {
						contextmenu_rename[0].text = ele.name;
					}
				}
			});
			routing_points.forEach(function (ele) {
				if (ele.feature === feature) {
					if (ele.name !== null && ele.name !== undefined && ele.name !== "Unnamed") {
						contextmenu_rename[0].text = ele.name;
					}
				}
			});
			routes.forEach(function (ele) {
				ele.coords.forEach(function (ele2) {
					if (ele2.feature === feature) {
						if (ele2.name !== null && ele2.name !== undefined && ele2.name !== "Unnamed") {
							contextmenu_rename[0].text = ele2.name;
						}
					}
				});
			});
			if (start.feature === feature) {
				if (start.name !== null && start.name !== undefined && start.name !== "Unnamed") {
					contextmenu_rename[0].text = start.name;
				}
			}

		} else if (feature.getProperties().type === 'route') {
			route = find_route_by_feature(feature);
			if (route) {
				contextmenu_rename[0].text = route.name;
			}
		}

		contextmenu.extend(contextmenu_rename);
		if (canwrite === true) {
			contextmenu.extend(['-']);
			if (found_route && found_route !== curr_route && feature.getProperties().type === "route") {
				contextmenu.extend(contextmenu_edit_route);
				contextmenu.extend(contextmenu_delete_route);
			} else if (feature.getProperties().type === "marker") {
				contextmenu.extend(contextmenu_delete_marker);
				if (found_route !== curr_route) {
					contextmenu.extend(contextmenu_edit_route);
					contextmenu.extend(contextmenu_delete_route);
				}
			}
			if (found_route !== curr_route) {
				contextmenu.extend(contextmenu_add_point);
			}
		}
	} else {
		contextmenu.clear();
		if (canwrite === true) {
			if (mode === 'route') {
				contextmenu.extend(contextmenu_items_route);
			} else {
				contextmenu.extend(contextmenu_items_view);
			}
		}
	}
});

function get_nearest(coord, place_function, type, feature) {
	var coordstring = coord.join(',');
	var http = new XMLHttpRequest();
	var url = url_osrm_nearest + coordstring;
	http.open("GET", url, true);
	http.onreadystatechange = function () {
		if (http.readyState == XMLHttpRequest.DONE) {
			let json_res = JSON.parse(http.responseText);
			if (json_res.code === "Ok") {
				place_function(json_res.waypoints[0].location, type, feature);
			} else {
				place_function(null, type);
			}
		}
	}
	http.send(null);
}

function get_route(coord_arr, route_id, feature_save) {
	coord_list = [];
	coord_arr.forEach(function (ele) {
		coord_list.push(ele.coord.join(","));
	});
	if (coord_list.length < 2) {
		return;
	}
	coord_string = coord_list.join(";");
	var http = new XMLHttpRequest();
	var url = url_osrm_route + coord_string + "?overview=full";
	http.open("GET", url, true);
	http.onreadystatechange = function () {
		if (http.readyState == XMLHttpRequest.DONE) {
			let json_res = JSON.parse(http.responseText);
			if (json_res.code === "Ok") {
				console.log(json_res);
				draw_route(json_res.routes[0].geometry, route_id, feature_save);
			} else {
				console.log("no bueno :(");
			}
		}
	}
	http.send(null);
}

function draw_route(polyline, route_id, feature_save) {
	var route = new ol.format.Polyline({
			factor: 1e5
		}).readGeometry(polyline, {
			dataProjection: 'EPSG:4326',
			featureProjection: 'EPSG:3857'
		});
	var feature = new ol.Feature({
			type: 'route',
			geometry: route,
			id: route_id
		});
	feature.setStyle(line_styles.route);
	vectorSource.addFeature(feature);
	feature_save.route = feature;

}

function get_trip(trip_string) {
	var http = new XMLHttpRequest();
	var url = url_osrm_trip + trip_string;
	http.open("GET", url, true);
	http.onreadystatechange = function () {
		if (http.readyState == XMLHttpRequest.DONE) {
			let json_res = JSON.parse(http.responseText);
			if (json_res.code === "Ok") {
				console.log(json_res);
				draw_trip(json_res.trips[0].geometry);
			} else {
				console.log("no bueno :(");
			}
		}
	}
	http.send(null);
}

function get_alt_trip(trip_string) {
	var http = new XMLHttpRequest();
	var url = url_osrm_trip + trip_string;
	http.open("GET", url, true);
	http.onreadystatechange = function () {
		if (http.readyState == XMLHttpRequest.DONE) {
			let json_res = JSON.parse(http.responseText);
			if (json_res.code === "Ok") {
				console.log(json_res);
				get_alt_route(json_res);
			} else {
				console.log("no bueno :(");
			}
		}
	}
	http.send(null);
}

function coord_in_route(coord) {
	var return_obj = new Object;
	return_obj.route = null;
	return_obj.pos = null;
	return_obj.type = null;
	return_obj.ok = null;
	routes.forEach(function (route_ele) {
		route_ele.coords.forEach(function (coord_ele) {
			if (coord_ele.coord[0] == coord[0] && coord_ele.coord[1] == coord[1]) {
				return_obj.route = routes.indexOf(route_ele);
				return_obj.pos = route_ele.coords.indexOf(coord_ele);
				if (return_obj.pos == 0) {
					return_obj.type = 'first';
					return_obj.ok = 'ok';
				} else if (return_obj.pos == (route_ele.coords.length - 1)) {
					return_obj.type = 'end';
					return_obj.ok = 'ok';
				} else {
					return_obj.type = 'middle';
					return_obj.ok = 'ok';
				}
			}
		});
	});
	console.log(return_obj);
	if (return_obj.ok == 'ok') {
		return return_obj;
	} else {
		return null;
	}
}

function get_alt_route(json) {
	var trip_list = [];
	json.waypoints.sort(function (a, b) {
		if (a.waypoint_index > b.waypoint_index) {
			return 1;
		} else if (a.waypoint_index < b.waypoint_index) {
			return -1;
		} else {
			return 0;
		}
	});
	var trip_lines = vectorSource.getFeatures();
	trip_lines.forEach(function (ele) {
		if (ele.getProperties().type == 'trip') {
			vectorSource.removeFeature(ele);
		}
	});
	json.waypoints.forEach(function (ele) {
		var in_route = coord_in_route(ele.location);
		console.log(in_route);
		if (in_route === null) {
			trip_list.push(ele.location.join(','));
		} else {
			if (in_route.type == 'first') {
				for (i = 0; i < routes[in_route.route].coords.length; i++) {
					trip_list.push(routes[in_route.route].coords[i].coord.join(','));
				}
			} else if (in_route.type == 'last') {
				for (i = routes[in_route.route].coords.length - 1; i >= 0; i--) {
					trip_list.push(routes[in_route.route].coords[i].coord.join(','));
				}
			}
		}
	});
	trip_list.push(start.coord.join(','));
	number_all(trip_list);
	var trip_string = trip_list.join(";");
	var http = new XMLHttpRequest();
	var url = url_osrm_route + trip_string + "?overview=full&continue_straight=true";
	http.open("GET", url, true);
	http.onreadystatechange = function () {
		if (http.readyState == XMLHttpRequest.DONE) {
			let json_res = JSON.parse(http.responseText);
			if (json_res.code === "Ok") {
				console.log(json_res);
				draw_trip(json_res.routes[0].geometry);
			} else {
				console.log("no bueno :(");
			}
		}
	}
	http.send(null);
}

function draw_trip(polyline) {
	var trip_lines = vectorSource.getFeatures();
	if (trip_lines) {
		trip_lines.forEach(function (ele) {
			if (ele.getProperties().type == 'trip') {
				vectorSource.removeFeature(ele);
			}
		});
	}
	if (startup == true) {
		return;
	}
	var trip = new ol.format.Polyline({
			factor: 1e5
		}).readGeometry(polyline, {
			dataProjection: 'EPSG:4326',
			featureProjection: 'EPSG:3857'
		});
	//var linestring = new ol.geom.LineString(trip)
	//linestring.transform('EPSG:4326', 'EPSG:3857');
	//console.log(linestring);
	var feature = new ol.Feature({
			type: 'trip',
			geometry: trip,
			id: 'trip_line'
		});
	//feature.setGeometry(linestring);
	feature.setStyle(styleFunction);
	console.log(feature);
	trip_line = feature;
	if (startup !== true) {
		save_state();
	}
	vectorSource.addFeature(feature);
	//vectorSource.addFeature(linestring);
}
function number_all(trip_list) {
	var index = 0;
	trip_list.forEach(function (ele) {
		if (pois.length > 0) {
			pois.forEach(function (ele2) {
				if (ele2.coord.join(',') == ele) {
					ele2.feature.set('order', index.toString());
				}
			});
		}
		if (routing_points.length > 0) {
			routing_points.forEach(function (ele2) {
				if (ele2.coord.join(',') == ele) {
					ele2.feature.set('order', index.toString());
				}
			});
		}
		if (routes.length > 0) {
			routes.forEach(function (ele2) {
				ele2.coords.forEach(function (ele3) {
					if (ele3.coord.join(',') == ele) {
						ele3.feature.set('order', index.toString());
					}
				});
			});
		}
		index++;
	});
}
