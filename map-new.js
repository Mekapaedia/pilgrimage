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
		curr_route = new Array();
		curr_route.name = json_obj.routes[i].name;
		for (var j = 0; j < json_obj.routes[i].markers.length; j++) {
			json_obj.routes[i].markers[j].coordinate = trans(json_obj.routes[i].markers[j].coordinate, 3);
			add_marker(json_obj.routes[i].markers[j]);
		}
		update_curr_route();
		routes.push(curr_route);
	}
	mode = 'trip';
}

var save_state = function (json_str) {
	var http = new XMLHttpRequest();
	var url = url_save;
	http.open("POST", url, true);
	http.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	console.log(json_str);
	http.send(json_str);
};

var get_state = function () {
	startup = true;
	console.log("Loading...");
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
				font: '11px Arial,sans-serif',
				fill: new ol.style.Fill({
					color: '#000'
				}),
				stroke: new ol.style.Stroke({
					color: '#fff',
					width: 1
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

var draw_route = function (polyline, route_type) {
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
	feature.setStyle(trip_style);
	if (route_type == 'route') {
		curr_route.route = feature;
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
		vector_source.removeFeature(curr_route.route);
		curr_route.route = null;
	}
};

var update_route = function () {
	remove_trip_line();
	if (feature_list_test.length < 2 || !getcoordstr(start) || getcoordstr(start) == '') {
		return;
	}

	if (routes.length < 1) {
		var url = url_osrm_trip;
		if (getcoordstr(start) != '') {
			url = url + getcoordstr(start) + ";";
		}
		url = url + points.collapse() + "?overview=full";
		var http = new XMLHttpRequest();
		http.open("GET", url, true);
		http.onreadystatechange = function () {
			if (http.readyState == XMLHttpRequest.DONE) {
				let json_res = JSON.parse(http.responseText);
				if (json_res.code === "Ok") {
					distance = json_res.trips[0].distance;
					time = json_res.trips[0].duration;
					draw_route(json_res.trips[0].geometry, 'trip');
					save_state(jsonize_thinger());
				}
			}
		}
		http.send(null);
	} else {
		var url = url_osrm_matrix;
		url = url + getcoordstr(start) + ";" + points.collapse();
		for (var i = 0; i < routes.length; i++) {
			url = url + ";" + arr_collapse(routes[i]);
		}
		var http = new XMLHttpRequest();
		http.open("GET", url, true);
		http.onreadystatechange = function () {
			if (http.readyState == XMLHttpRequest.DONE) {
				let json_res = JSON.parse(http.responseText);
				if (json_res.code === "Ok") {
					tsp_solver(json_res.durations);
					var url2 = url_osrm_route;
					url2 = url2 + tsp_route.collapse() + "?overview=full";
					var http2 = new XMLHttpRequest();
					http2.open("GET", url2, true);
					http2.onreadystatechange = function () {
						if (http2.readyState == XMLHttpRequest.DONE) {
							let json_res2 = JSON.parse(http2.responseText);
							if (json_res2.code === "Ok") {
								distance = json_res2.routes[0].distance;
								time = json_res2.routes[0].duration;
								draw_route(json_res2.routes[0].geometry, 'trip');
								save_state(jsonize_thinger());
							}
						}
					}
					http2.send(null);
				}
			}
		}
		http.send(null);
	}
};

var update_curr_route = function () {
	remove_curr_route_line();
	if (curr_route.length < 2) {
		return;
	}

	var url = url_osrm_route + arr_collapse(curr_route) + "?overview=full&continue_straight=true";
	var http = new XMLHttpRequest();
	http.open("GET", url, true);
	http.onreadystatechange = function () {
		if (http.readyState == XMLHttpRequest.DONE) {
			let json_res = JSON.parse(http.responseText);
			if (json_res.code === "Ok") {
				draw_route(json_res.routes[0].geometry, 'route');
				curr_route.time = json_res.routes[0].duration;
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
	http.open("GET", url, true);
	http.onreadystatechange = function () {
		if (http.readyState == XMLHttpRequest.DONE) {
			let json_res = JSON.parse(http.responseText);
			if (json_res.code === "Ok") {
				feature.setGeometry(new ol.geom.Point(ol.proj.fromLonLat(json_res.waypoints[0].location)));
				update_route();
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
	console.log(start);
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
				curr_route.push(feature);
			}
		}
	} else {
		feature.setId('pin ' + count);
		feature_list_test.push(feature);
		if (mode == 'trip') {
			points.push(feature);
		} else if (mode == 'route') {
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

function seejson() {
	console.log(feature_list_test.serialise());
}

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
		points.splice(points.indexOf(feature), 1);
	} else {
		start = null;
	}
	map.removeInteraction(feature.getProperties()['interaction']);
	vector_source.removeFeature(feature);
	update_route();
};

var rename_marker = function (obj) {
	var feature = map.getFeaturesAtPixel(map.getPixelFromCoordinate(obj.coordinate))[0];
	var new_name = prompt("Enter a new name for the marker " + feature.getProperties().marker_name + ":");
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
	curr_route = new Array();
	curr_route.time = 0;
	routes.push(curr_route);
	mode = 'route';
};

var exit_route = function (obj) {
	update_route();
	if (curr_route.length < 1) {
		routes.splice(routes.indexOf(curr_route), 1);
	}
	mode = 'trip';
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

var context_exit_route = {
	text: "Return to trip",
	icon: "exit_32.png",
	callback: exit_route
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
	var feature = map.forEachFeatureAtPixel(evt.pixel, function (ft, l) {
			return ft;
		});
	contextmenu.clear();
	if (mode == 'trip') {
		contextmenu.extend([context_add, context_set]);
	} else if (mode == 'route') {
		contextmenu.extend([context_add_marker, context_exit_route]);
	}
	if (feature) {
		if (feature.getProperties()['feature_type'] == 'marker') {
			contextmenu.clear();
			var feature_name = feature.getProperties().marker_name;
			var context_rename = {
				text: feature_name,
				callback: rename_marker
			};
			contextmenu.extend([context_rename]);
			if (feature.getId() != "start") {
				contextmenu.extend([context_change_type]);
			}
			contextmenu.extend(["-", context_delete_marker]);
		}
	}
});

var tsp_solver = function (matrix) {
	tsp_route.splice(0, tsp_route.length);
	console.log(matrix);
	tsp_route.push(start);
	for (var i = 0; i < points.length; i++) {
		tsp_route.push(points[i]);
	}
	for (var i = 0; i < routes.length; i++) {
		for (var j = 0; j < routes[i].length; j++) {
			tsp_route.push(routes[i][j]);
		}
	}
	tsp_route.push(start);
};