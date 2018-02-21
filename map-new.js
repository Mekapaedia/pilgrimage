var url_osrm_nearest = 'https://mekapaedia.com:5001/nearest/v1/driving/';
var url_osrm_route = 'https://mekapaedia.com:5001/route/v1/driving/';
var url_osrm_trip = 'https://mekapaedia.com:5001/trip/v1/driving/';
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
		json_obj.start.coords = [start_coords[0], start_coords[1]];
	}
	json_obj.routes = routes;
	json_obj.points = points.json_obj();
	return JSON.stringify(json_obj);
}

function unjsonize_thinger(json_str) {
	var json_obj = JSON.parse(json_str);
	if (json_obj.start.coords != undefined) {
		json_obj.start.coords = trans(json_obj.start.coords, 3);
		start_obj = new Object;
		start_obj.coordinate = json_obj.start.coords;
		add_start_marker(start_obj);
	}
	for (var i = 0; i < json_obj.points.length; i++) {
		json_obj.points[i].coords = trans(json_obj.points[i].coords, 3);
		point_obj = new Object;
		point_obj.coordinate = json_obj.points[i].coords;
		add_marker(point_obj);
	}
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

var feature_list_test = []
var start = null
	var points = []
	var routes = []
	var trip = []

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

points.collapse = function () {
	var temp_arr = [];
	for (var i = 0; i < this.length; i++) {
		temp_arr.push(getcoordstr(this[i]));
	}
	return temp_arr.join(";");
}

points.json_obj = function () {
	var temp_arr = [];
	for (var i = 0; i < this.length; i++) {
		var point_obj = new Object;
		point_obj.coords = trans(getcoords(this[i]), 4);
		point_obj.label = this[i].getId();
		point_obj.type = this[i].getProperties().marker_type;
		temp_arr.push(point_obj);
	}
	return temp_arr;
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
	vector_source.addFeature(feature);
}

var update_route = function () {
	vector_source.getFeatures().forEach(function (ele) {
		if (ele.getProperties()['feature_type'] == 'trip') {
			vector_source.removeFeature(ele);
		}
	});
	if (feature_list_test.length < 2) {
		return;
	}

	/*var url = url_osrm_route + feature_list_test.collapse() + "?overview=full&continue_straight=true";
	var http = new XMLHttpRequest();
	http.open("GET", url, true);
	http.onreadystatechange = function () {
	if (http.readyState == XMLHttpRequest.DONE) {
	let json_res = JSON.parse(http.responseText);
	if (json_res.code === "Ok") {
	draw_route(json_res.routes[0].geometry);
	}
	}
	}
	http.send(null);*/

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
}

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
	feature.setProperties({
		'interaction': drag_interaction,
		'feature_type': 'marker',
		'marker_type': 'blank',
		'marker_name': 'Unnamed',
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
			points.push(feature);
		}
	} else {
		feature.setId('pin ' + count);
		feature_list_test.push(feature);
		points.push(feature);
	}
	count++;
	vector_source.addFeature(feature);
	if (startup != true) {
		update_route();
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
	mode = 'route';
};

var exit_route = function (obj) {
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
