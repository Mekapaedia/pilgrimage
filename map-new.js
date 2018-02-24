var url_osrm_nearest = 'https://mekapaedia.com:5001/nearest/v1/driving/';
var url_osrm_route = 'https://mekapaedia.com:5001/route/v1/driving/';
var url_osrm_trip = 'https://mekapaedia.com:5001/trip/v1/driving/';
var url_osrm_matrix = 'https://mekapaedia.com:5001/table/v1/table/';
var url_save = 'https://mekapaedia.com/router/saver-new.cgi';
var url_get = 'https://mekapaedia.com/router/getter-new.cgi';

var pin_blank = 'blank_pin_32.png';
var pin_start = 'start_pin_32.png';
var pin_route = 'route_pin_32.png';
var pin_poi = 'poi_pin_32.png';
var pin_routing = 'routing_pin_32.png';
var count = 0;
var distance = 0;
var time = 0;
var startup = false;
var mode = 'trip';
var return_wait = false;
var edits = 0;

function getcoords(feature) {
	return feature.getGeometry().getCoordinates();
}

function trans(coords, towhat) {
	var origcoords = '';
	var newcoords = '';
	if (towhat == 4 || towhat == 'EPSG:4326' || towhat == '4326') {
		origcoords = 'EPSG:3857';
		newcoords = 'EPSG:4326';
	} else if (towhat == 3 || towhat == 'EPSG:3857' || towhat == '3857') {
		origcoords = 'EPSG:4326';
		newcoords = 'EPSG:3857';
	}
	return ol.proj.transform(coords, origcoords, newcoords)
}

function getcoordstr(feature) {
	if (feature == null) {
		return '';
	}
	return trans(getcoords(feature), 4).join(',');
}

function jsonize_thinger() {
	var json_obj = new Object;
	json_obj.start = new Object;
	if (start != null) {
		var start_coords = trans(getcoords(start), 4);
		json_obj.start.coordinate = [start_coords[0], start_coords[1]];
	}
	json_obj.routes = routes.json_obj();
	json_obj.points = points.json_obj();
	return JSON.stringify(json_obj);
}

function unjsonize_thinger(json_str) {
	var json_obj = JSON.parse(json_str);
	if (json_obj.start.coordinate != undefined) {
		json_obj.start.coordinate = trans(json_obj.start.coordinate, 3);
		add_start_marker(json_obj.start);
	}
	for (var i = 0; i < json_obj.points.length; i++) {
		json_obj.points[i].coordinate = trans(json_obj.points[i].coordinate, 3);
		add_marker(json_obj.points[i]);
	}
	mode = 'route';
	for (var i = 0; i < json_obj.routes.length; i++) {
		routes.push([])
		curr_route = routes[routes.length - 1];
		curr_route.name = json_obj.routes[i].name;
		for (var j = 0; j < json_obj.routes[i].markers.length; j++) {
			json_obj.routes[i].markers[j].coordinate = trans(json_obj.routes[i].markers[j].coordinate, 3);
			add_marker(json_obj.routes[i].markers[j]);
		}
		update_curr_route();
	}
	mode = 'trip';
	update_route();
}

var save_state = function (json_str) {
	var http = new XMLHttpRequest();
	var url = url_save;
	http.open("POST", url, true);
	http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	http.send(json_str);
};

var get_state = function () {
	startup = true;
	console.log("Loading...");
	var images = []
	images.push(new Image());
	images[images.length - 1].src = pin_blank;
	images.push(new Image());
	images[images.length - 1].src = pin_start;
	images.push(new Image());
	images[images.length - 1].src = pin_route;
	images.push(new Image());
	images[images.length - 1].src = pin_poi;
	images.push(new Image());
	images[images.length - 1].src = pin_routing;
	var http = new XMLHttpRequest();
	var url = url_get + "?please=yes";
	http.open("GET", url, true);
	http.onreadystatechange = function () {
		if (http.readyState == XMLHttpRequest.DONE) {
			console.log("Done!");
			unjsonize_thinger(http.responseText);
			startup = false;
		}
	}
	http.send(null);
};

get_state();

var feature_list_test = [];
var start = null;
var points = [];
var routes = [];
var trip = [];
var curr_route = null;
var tsp_route = [];

feature_list_test.collapse = function (type) {
	var temp_arr = [];
	for (var i = 0; i < this.length; i++) {
		temp_arr.push(getcoordstr(this[i]));
	}
	if (type != 'trip') {
		temp_arr.push(getcoordstr(this[0]));
	}
	return temp_arr.join(";");
};

var arr_collapse = function (arr) {
	var temp_arr = [];
	for (var i = 0; i < arr.length; i++) {
		temp_arr.push(getcoordstr(arr[i]));
	}
	return temp_arr.join(";");
};

points.collapse = function () {
	return arr_collapse(this);
}

tsp_route.collapse = function () {
	return arr_collapse(this);
}

var arr_json_obj = function (arr) {
	var temp_arr = [];
	for (var i = 0; i < arr.length; i++) {
		var point_obj = new Object;
		point_obj.coordinate = trans(getcoords(arr[i]), 4);
		point_obj.label = arr[i].getId();
		point_obj.marker_type = arr[i].getProperties().marker_type;
		point_obj.name = arr[i].getProperties().marker_name;
		if (!point_obj.marker_type) {
			point_obj.marker_type = 'blank';
		}
		temp_arr.push(point_obj);
	}
	return temp_arr;

};

routes.json_obj = function () {
	var temp_arr = [];
	for (var i = 0; i < this.length; i++) {
		var route_obj = new Object;
		route_obj.name = this[i].name;
		if (!route_obj.name) {
			route_obj.name = "Unnamed";
		}
		route_obj.markers = arr_json_obj(this[i]);
		temp_arr.push(route_obj);
	}
	return temp_arr;
}

points.json_obj = function () {
	return arr_json_obj(this);
}

var marker_style = function (feature) {
	var icon_url = pin_blank;
	var icon_text = this.getId();
	if (this.getProperties().is_start == 'yeah') {
		icon_url = pin_start;
	} else if (this.getProperties().marker_type == 'route') {
		icon_url = pin_route;
	} else if (this.getProperties().marker_type == 'poi') {
		icon_url = pin_poi;
	} else if (this.getProperties().marker_type == 'routing') {
		icon_url = pin_routing;
	}
	var style = new ol.style.Style({
			image: new ol.style.Icon({
				src: icon_url,
				scale: 1,
				anchor: [.5, 1],
			}),
			text: new ol.style.Text({
				font: '12px Arial,sans-serif',
				fill: new ol.style.Fill({
					color: '#000'
				}),
				stroke: new ol.style.Stroke({
					color: '#ddd',
					width: 2
				}),
				text: icon_text
			})
		});
	return style;
};

var vector_source = new ol.source.Vector();

var raster_layer = new ol.layer.Tile({
		source: new ol.source.OSM()
	});

var vector_layer = new ol.layer.Vector({
		source: vector_source
	});

var map = new ol.Map({
		target: 'map',
		layers: [
			raster_layer,
			vector_layer
		],
		view: new ol.View({
			center: ol.proj.fromLonLat([-1.3293, 51.06205]),
			zoom: 4
		})
	});

map.on('pointermove', function (e) {

	if (e.dragging) {
		map.getTargetElement().style.cursor = '-webkit-grabbing';
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

var draw_route = function (polyline, route_type, specific_route) {
	var route = new ol.format.Polyline({
			factor: 1e5
		}).readGeometry(polyline, {
			dataProjection: 'EPSG:4326',
			featureProjection: 'EPSG:3857'
		});

	var feature = new ol.Feature({
			geometry: route,
		});
	if (route_type == 'trip' || !route_type) {
		feature.setProperties({
			'feature_type': 'trip'
		});
	} else if (route_type == 'route') {
		feature.setProperties({
			'feature_type': 'route'
		});
	}
	var trip_style = null;
	if (route_type == 'trip' || !route_type) {
		var trip_style = [
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					width: 6,
					color: [0, 0, 0, .7]
				})
			})
		];

	} else if (route_type == 'route') {
		var trip_style = [
			new ol.style.Style({
				stroke: new ol.style.Stroke({
					width: 6,
					color: [0, 0, 170, .7]
				})
			})
		];
	}
	if (!specific_route) {
		specific_route = curr_route
	}
	feature.setStyle(trip_style);
	if (route_type == 'route') {
		feature.setProperties({
			'parent_route': specific_route
		});
		specific_route.route = feature;
	}
	vector_source.addFeature(feature);
}

var remove_trip_line = function () {
	vector_source.getFeatures().forEach(function (ele) {
		if (ele.getProperties()['feature_type'] == 'trip') {
			vector_source.removeFeature(ele);
		}
	});
};

var remove_curr_route_line = function () {
	if (curr_route.route) {
		vector_source.getFeatures().forEach(function (ele) {
			if (ele.getProperties()['feature_type'] == 'route' && ele.getProperties().parent_route == curr_route) {
				vector_source.removeFeature(ele);
			}
		});
		curr_route.route = null;
	}
};

var update_route = function () {
	remove_trip_line();
	if (points.length + routes.length < 1 || !getcoordstr(start) || getcoordstr(start) == '') {
		save_state(jsonize_thinger());
		return;
	}
	var url = url_osrm_matrix;
	url = url + getcoordstr(start);
	if (points.length > 0) {
		url = url + ";" + points.collapse();
	}
	for (var i = 0; i < routes.length; i++) {
		url = url + ";" + getcoordstr(routes[i][0]) + ";" + getcoordstr(routes[i][routes[i].length - 1]);
	}
	var http = new XMLHttpRequest();
	var async = true;
	http.open("GET", url, async);
	http.onreadystatechange = function () {
		if (http.readyState == XMLHttpRequest.DONE) {
			let json_res = JSON.parse(http.responseText);
			if (json_res.code === "Ok") {
				tsp_solver(json_res.durations);
				var url2 = url_osrm_route;
				url2 = url2 + tsp_route.collapse() + "?overview=full&continue_straight=true";
				var http2 = new XMLHttpRequest();
				async = true;
				http2.open("GET", url2, async);
				http2.onreadystatechange = function () {
					if (http2.readyState == XMLHttpRequest.DONE) {
						let json_res2 = JSON.parse(http2.responseText);
						if (json_res2.code === "Ok") {
							distance = json_res2.routes[0].distance;
							time = json_res2.routes[0].duration;
							draw_route(json_res2.routes[0].geometry, 'trip');
							save_state(jsonize_thinger());
							if (edits > 0) {
								edits--;
							}
							if (edits > 0) {
								update_route();
							}
						}
					}
				}
				http2.send(null);
			}
		}
	}
	http.send(null);
};

var update_curr_route = function () {
	remove_curr_route_line();
	if (curr_route.length < 2) {
		return;
	}

	var url = url_osrm_route + arr_collapse(curr_route) + "?overview=full&continue_straight=true";
	var http = new XMLHttpRequest();
	var async = true;
	var my_curr_route = curr_route;
	http.open("GET", url, async);
	http.onreadystatechange = function () {
		if (http.readyState == XMLHttpRequest.DONE) {
			let json_res = JSON.parse(http.responseText);
			if (json_res.code === "Ok") {
				draw_route(json_res.routes[0].geometry, 'route', my_curr_route);
				my_curr_route.time = json_res.routes[0].duration;
			}
		}
	}
	http.send(null);
};

var get_nearest = function (feature) {
	coord = ol.proj.transform(feature.getGeometry().getCoordinates(), 'EPSG:3857', 'EPSG:4326');
	var coordstring = coord.join(',');
	var http = new XMLHttpRequest();
	var url = url_osrm_nearest + coordstring;
	var async = true;
	var in_startup = startup;
	http.open("GET", url, async);
	http.onreadystatechange = function () {
		if (http.readyState == XMLHttpRequest.DONE) {
			let json_res = JSON.parse(http.responseText);
			if (json_res.code === "Ok") {
				feature.setGeometry(new ol.geom.Point(ol.proj.fromLonLat(json_res.waypoints[0].location)));
				if (!in_startup) {
					if (mode == 'trip') {
						if (feature.getProperties().marker_type == 'route') {
							mode = 'route';
							curr_route = feature.getProperties().parent_route;
							update_curr_route();
							mode = 'trip';
						}
						update_route();
					} else if (mode == 'route') {
						update_curr_route();
					}
				}
			}
		}
	}
	http.send(null);
};

var add_start_marker = function (obj) {
	vector_source.getFeatures().forEach(function (ele) {
		if (ele.getId() == 'start') {
			feature_list_test.splice(feature_list_test.indexOf(ele), 1);
			map.removeInteraction(ele.getProperties()['interaction']);
			vector_source.removeFeature(ele);
		}
	});
	obj.marker_label = 'start';
	obj.is_start = 'yeah';
	add_marker(obj);
};

var add_marker = function (obj) {
	var coord = ol.proj.transform(obj.coordinate, 'EPSG:3857', 'EPSG:4326');
	feature = new ol.Feature({
			type: 'marker',
			geometry: new ol.geom.Point(ol.proj.fromLonLat(coord)),
		});
	feature.setStyle(marker_style);
	var drag_interaction = new ol.interaction.Modify({
			features: new ol.Collection([feature]),
			style: null
		});
	drag_interaction.on('modifyend', function () {
		get_nearest(this)
	}, feature);

	if (!obj.marker_type) {
		if (mode != 'route') {
			obj.marker_type = 'blank';
		} else {
			obj.marker_type = 'route';
		}
	}
	if (!obj.name) {
		obj.name = "Unnamed";
	}
	feature.setProperties({
		'interaction': drag_interaction,
		'feature_type': 'marker',
		'marker_type': obj.marker_type,
		'marker_name': obj.name,
	});
	map.addInteraction(drag_interaction);
	get_nearest(feature);
	if (obj.marker_label != null && obj.marker_label != undefined && obj.marker_label != '') {
		feature.setId(obj.marker_label);
		if (obj.is_start == 'yeah') {
			start = feature;
			feature.setProperties({
				'is_start': 'yeah',
				'marker_name': 'Start',
			});
			feature_list_test.unshift(feature);
		} else {
			feature_list_test.push(feature);
			if (mode == 'trip') {
				points.push(feature);
			} else if (mode == 'route') {
				feature.setProperties({
					'parent_route': curr_route
				});
				curr_route.push(feature);
			}
		}
	} else {
		feature.setId('pin ' + count);
		feature_list_test.push(feature);
		if (mode == 'trip') {
			points.push(feature);
		} else if (mode == 'route') {
			feature.setProperties({
				'parent_route': curr_route
			});
			curr_route.push(feature);
		}
	}
	count++;
	vector_source.addFeature(feature);
	if (mode == 'trip' && !startup) {
		update_route();
	} else if (mode == 'route' && !startup) {
		update_curr_route();
	}
};

var contextmenu = new ContextMenu({
		width: 170,
		defaultItems: false,
		items: []
	});
map.addControl(contextmenu);

var delete_marker = function (obj) {
	var feature = map.getFeaturesAtPixel(map.getPixelFromCoordinate(obj.coordinate))[0];
	feature_list_test.splice(feature_list_test.indexOf(feature), 1);
	if (feature.getProperties().is_start != 'yeah') {
		if (feature.getProperties().parent_route && mode == 'trip') {
			mode = 'route';
			curr_route = feature.getProperties().parent_route;
			curr_route.splice(curr_route.indexOf(feature), 1);
			if (curr_route.length < 1) {
				routes.splice(routes.indexOf(curr_route), 1);
				update_curr_route();
				curr_route = null;
			} else {
				update_curr_route();
			}
			mode = 'trip';
		} else if (mode == 'route') {
			curr_route.splice(curr_route.indexOf(feature), 1);
			if (curr_route.length < 1) {
				routes.splice(routes.indexOf(curr_route), 1);
				update_curr_route();
				exit_route();
			} else {
				update_curr_route();
			}
		} else {
			points.splice(points.indexOf(feature), 1);
		}
	} else {
		start = null;
	}
	map.removeInteraction(feature.getProperties()['interaction']);
	vector_source.removeFeature(feature);
	if (mode == 'trip') {
		update_route();
		edits++;
	}
};

var rename_marker = function (obj) {
	var feature = map.getFeaturesAtPixel(map.getPixelFromCoordinate(obj.coordinate))[0];
	if (feature.getId() == 'start') {
		return;
	}
	var new_name = prompt("Enter a new name for the marker " + feature.getProperties().marker_name + ":", feature.getProperties().marker_name);
	if (new_name) {
		feature.setProperties({
			'marker_name': new_name
		});
	}
	save_state(jsonize_thinger());
};

var poi_marker = function (obj) {
	var feature = map.getFeaturesAtPixel(map.getPixelFromCoordinate(obj.coordinate))[0];
	feature.setProperties({
		'marker_type': 'poi'
	});
	save_state(jsonize_thinger());
};

var routing_marker = function (obj) {
	var feature = map.getFeaturesAtPixel(map.getPixelFromCoordinate(obj.coordinate))[0];
	feature.setProperties({
		'marker_type': 'routing'
	});
	save_state(jsonize_thinger());
};

var add_route = function (obj) {
	remove_trip_line();
	routes.push([]);
	curr_route = routes[routes.length - 1];
	curr_route.time = 0;
	curr_route.name = "Unnamed";
	mode = 'route';
};

var exit_route = function (obj) {
	update_route();
	if (curr_route.length < 1 && curr_route != null) {
		routes.splice(routes.indexOf(curr_route), 1);
	}
	mode = 'trip';
};

var edit_route = function (obj) {
	remove_trip_line();
	mode = 'route';
	var features = map.getFeaturesAtPixel(map.getPixelFromCoordinate(obj.coordinate));
	for (var i = 0; i < features.length; i++) {
		if (features[i].getProperties().parent_route) {
			curr_route = features[i].getProperties().parent_route;
			break;
		}
	}
};

var rename_route = function (obj) {
	var old_curr_route = curr_route;
	var features = map.getFeaturesAtPixel(map.getPixelFromCoordinate(obj.coordinate));
	for (var i = 0; i < features.length; i++) {
		if (features[i].getProperties().parent_route) {
			curr_route = features[i].getProperties().parent_route;
			break;
		}
	}
	var new_name = prompt("Enter a new name for the route " + curr_route.name + ":", curr_route.name);
	if (new_name) {
		curr_route.name = new_name;
	}
	curr_route = old_curr_route;
	save_state(jsonize_thinger());
};

var delete_route = function (obj) {
	var old_curr_route = curr_route;
	var deleting_self = false;
	var old_mode = mode;
	var features = map.getFeaturesAtPixel(map.getPixelFromCoordinate(obj.coordinate));
	for (var i = 0; i < features.length; i++) {
		if (features[i].getProperties().parent_route) {
			curr_route = features[i].getProperties().parent_route;
			break;
		}
	}
	if (old_curr_route == curr_route) {
		deleting_self = true;
	}
	remove_curr_route_line();
	for (var i = 0; i < curr_route.length; i++) {
		map.removeInteraction(curr_route[i].getProperties()['interaction']);
		vector_source.removeFeature(curr_route[i]);
	}
	routes.splice(routes.indexOf(curr_route), 1);
	curr_route = null;
	mode = old_mode;
	if (!deleting_self) {
		curr_route = old_curr_route;
	} else if (deleting_self && mode == 'route') {
		mode = 'trip';
	}
	if (mode == 'trip') {
		update_route();
	}
	save_state(jsonize_thinger());
};

var context_delete_marker = {
	text: "Delete marker",
	icon: "delete_32.png",
	callback: delete_marker
};

var context_add_marker = {
	text: "Add marker",
	icon: "pin_32.png",
	callback: add_marker
};

var context_add_route = {
	text: "Add route",
	icon: "route_32.png",
	callback: add_route
};

var context_delete_route = {
	text: "Delete route",
	icon: "delete_32.png",
	callback: delete_route
};

var context_exit_route = {
	text: "Return to trip",
	icon: "exit_32.png",
	callback: exit_route
};

var context_edit_route = {
	text: "Edit route",
	icon: "edit_32.png",
	callback: edit_route
};

var context_add_start_marker = {
	text: "Set start",
	icon: "checkered_32.png",
	callback: add_start_marker
};

var context_type_poi = {
	text: "POI",
	callback: poi_marker
};

var context_type_routing = {
	text: "Routing",
	callback: routing_marker
};

var context_change_type = {
	text: "Change type",
	items: [context_type_poi, context_type_routing]
};

var context_set = {
	text: 'Set',
	items: [context_add_start_marker]
};

var context_add = {
	text: 'Add',
	items: [context_add_marker, context_add_route]
};

contextmenu.on('beforeopen', function (evt) {
	var features = [];
	var feature = null;
	map.forEachFeatureAtPixel(evt.pixel, function (ft, l) {
		features.push(ft);
	});
	if (features.length == 1) {
		feature = features[0];
	} else if (features.length > 1) {
		for (var i = 0; i < features.length; i++) {
			if (features[i].getProperties().feature_type == 'marker') {
				feature = features[i];
				break;
			}
		}
		if (!feature) {
			for (var i = 0; i < features.length; i++) {
				if (features[i].getProperties().parent_route) {
					feature = features[i];
					break;
				}
			}
		}
		if (!feature) {
			feature = features[features.length - 1];
		}
	}
	contextmenu.clear();
	if (mode == 'trip') {
		contextmenu.extend([context_add, context_set]);
	} else if (mode == 'route') {
		contextmenu.extend([context_add_marker, context_exit_route]);
	}
	if (feature) {
		if (feature.getProperties().parent_route || feature.getProperties()['feature_type'] == 'marker') {
			contextmenu.clear();
			if (feature.getProperties()['feature_type'] == 'marker') {
				var feature_name = feature.getProperties().marker_name;
				var context_rename = {
					text: feature_name,
					callback: rename_marker
				};
				contextmenu.extend([context_rename]);
				if (feature.getId() != "start" && feature.getProperties().marker_type != 'route') {
					contextmenu.extend([context_change_type]);
				}
			}
			if (feature.getProperties().parent_route) {
				if (feature.getProperties().feature_type == 'marker') {
					contextmenu.extend(['-']);
				}
				var route_name = feature.getProperties().parent_route.name;
				var context_rename_route = {
					text: route_name,
					callback: rename_route
				};
				contextmenu.extend([context_rename_route, context_edit_route])
				if (feature.getProperties().feature_type == 'route') {
					contextmenu.extend(['-']);
				}
			}
			if (feature.getProperties()['feature_type'] == 'marker') {
				contextmenu.extend(["-", context_delete_marker]);
			}
			if (feature.getProperties().parent_route) {
				contextmenu.extend([context_delete_route]);
			}
		}
	}
});

var route_dir = function (ele) {
	return route_zone(ele) % 2;
};

var route_pos = function (ele) {
	return parseInt(route_zone(ele) / 2, 10);
};

var route_zone = function (ele) {
	return (ele - points.length - 1);
};

var tsp_solver = function (matrix) {
	tsp_route.splice(0, tsp_route.length);
	var tsp_order = [];
	var tsp_unordered = [];

	for (var i = 1; i < matrix[0].length; i++) {
		tsp_unordered.push(i);
	}
	tsp_order.push(0);
	while (tsp_unordered.length > 0) {
		var marker_dist = 0;
		var marker = -1;
		for (var i = 0; i < tsp_order.length; i++) {
			for (var j = 0; j < tsp_unordered.length; j++) {
				var curr_marker = tsp_unordered[j];
				var curr_dist = matrix[tsp_order[i]][curr_marker];
				if (curr_dist > marker_dist) {
					marker_dist = curr_dist;
					marker = curr_marker
				}
			}
		}
		if (tsp_order.length == 1) {
			tsp_order.push(marker);
			tsp_unordered.splice(tsp_unordered.indexOf(marker), 1);
			if (marker > points.length) {
				if (route_dir(marker) == 0) {
					tsp_order.push(marker + 1);
					tsp_unordered.splice(tsp_unordered.indexOf(marker + 1), 1);
				} else {
					tsp_order.push(marker - 1);
					tsp_unordered.splice(tsp_unordered.indexOf(marker - 1), 1);

				}
			}
			tsp_order.push(0);
		} else {
			var tour_dist = Number.MAX_SAFE_INTEGER;
			var pre = -1;
			var post = -1;
			for (var i = 0; i < tsp_order.length - 1; i++) {
				if (i > 0 && tsp_order[i] > points.length && Math.abs(tsp_order[i + 1] - tsp_order[i]) == 1) {
					continue;
				}
				var pre_post_dist = matrix[tsp_order[i]][tsp_order[i + 1]];
				var pre_dist = matrix[tsp_order[i]][marker];
				var post_dist = matrix[marker][tsp_order[i + 1]];
				if (marker > points.length) {
					if (route_dir(marker) == 0) {
						post_dist = matrix[marker + 1][tsp_order[i + 1]];
					} else {
						post_dist = matrix[marker - 1][tsp_order[i + 1]];
					}
					var route_time = routes[route_pos(marker)].time;
					if (!route_time) {
						route_time = 0;
					}
					post_dist += route_time;
				}
				var curr_dist = pre_dist + post_dist - pre_post_dist;
				if (curr_dist < tour_dist) {
					tour_dist = curr_dist;
					pre = tsp_order[i];
					post = tsp_order[i + 1];
				}
			}
			tsp_order.splice(tsp_order.indexOf(pre) + 1, 0, marker);
			tsp_unordered.splice(tsp_unordered.indexOf(marker), 1);
			if (marker > points.length && routes[route_pos(marker)].length > 1) {
				if (route_dir(marker) == 0) {
					tsp_order.splice(tsp_order.indexOf(marker) + 1, 0, marker + 1);
					tsp_unordered.splice(tsp_unordered.indexOf(marker + 1), 1);
				} else {
					tsp_order.splice(tsp_order.indexOf(marker) + 1, 0, marker - 1);
					tsp_unordered.splice(tsp_unordered.indexOf(marker - 1), 1);
				}
			}
		}
	}
	for (var i = 1; i < tsp_order.length - 1; i++) {
		if (tsp_order[i] > points.length && routes[route_pos(tsp_order[i])].length > 1) {
			var pre_dist = matrix[tsp_order[i - 1]][tsp_order[i]];
			var post_dist = matrix[tsp_order[i + 1]][tsp_order[i + 2]];
			var swap_pre_dist = matrix[tsp_order[i - 1]][tsp_order[i + 1]];
			var swap_post_dist = matrix[tsp_order[i]][tsp_order[i + 2]];
			var dist = pre_dist + post_dist;
			var swap_dist = swap_pre_dist + swap_post_dist;
			if (swap_dist < dist) {
				var temp = tsp_order[i + 1];
				tsp_order[i + 1] = tsp_order[i];
				tsp_order[i] = temp;
			}
			i++;
		}
	}
	tsp_route.push(start);
	for (var i = 1; i < tsp_order.length - 1; i++) {
		if (tsp_order[i] <= points.length) {
			tsp_route.push(points[tsp_order[i] - 1]);
		} else {
			var route_arr = routes[route_pos(tsp_order[i])];
			if (route_dir(tsp_order[i]) == 1) {
				route_arr.reverse();
			}
			for (var j = 0; j < route_arr.length; j++) {
				tsp_route.push(route_arr[j]);
			}
			i++;
		}
	}
	for (var i = 1; i < tsp_route.length; i++) {
		tsp_route[i].setId(i.toString());
	}
	tsp_route.push(start);
};

var print_arr = function (arr) {
	var str = "["
		for (var i = 0; i < arr.length; i++) {
			str += arr[i];
			if (i < arr.length - 1) {
				str += ', ';
			}
		}
		str += ']';
	console.log(str)
};