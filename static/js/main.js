String.prototype.format = function() {
  a = this;
  for (k in arguments) {
    a = a.replace("{" + k + "}", arguments[k])
  }
  return a
}

//	The function that runs when the page loads
var URL_BASE = "jbovee.pythonanywhere.com",
	rows = 600,
	cols = 1128,
	cellHeight = 4,
	cellWidth = 4,
	interpolateColor = d3.interpolateInferno;

d3.select("div#heatmap")
	.style("position", "relative");

var court = d3.select("canvas#export")
	.attr("width", cols)
	.attr("height", rows)
	.style("position", "absolute")
	.style("left", "{0}px".format(-(cols/2)))
	.style("top", 0)
	.style("z-index", 0)

var court = d3.select("canvas#court")
	.attr("width", cols)
	.attr("height", rows)
	.style("position", "absolute")
	.style("left", "{0}px".format(-(cols/2)))
	.style("top", 0)
	.style("z-index", 1)

var canvas = d3.select("canvas#shots")
	.attr("width", cols)
	.attr("height", rows)
	.style("position", "absolute")
	.style("left", "{0}px".format(-(cols/2)))
	.style("top", 0)
	.style("z-index", 2)

var context = canvas.node().getContext("2d");
context.clearRect(0, 0, cols, rows);

var colorScale = d3.scaleSequential().interpolator(interpolateColor)
	.domain([0, rows]);

var svg = d3.select('svg#legend')
	.attr('width', 60)
	.attr('height', rows)
	.style('position', 'absolute')
	.style('left', '-634px');

var rects = svg.append('g')
	.selectAll('rect')
	.data(d3.range(rows), function(d) {return d;})
	.enter().append('rect')
	.attr('x', 40)
	.attr('y', function(d, i) {return rows-i;})
	.attr('height', 1)
	.attr('width', 40)
	.style('fill', function(d, i) {return colorScale(d);});

var yScale = d3.scaleLog().range([rows-6, 6]).domain([1, 2500]).base(10);
var yAxis = d3.axisLeft(yScale).ticks(3).tickFormat(d3.format('.0f'));
svg.append('g').attr('transform', 'translate(40,0)').attr('class', 'axis').call(yAxis);

$(function() {
	load_selection('team_market', 'team', {
		"kw1": "team_name",
		"kw2": "team_alias"
	});
	load_selection('team_conf_alias', 'conf');
	// Load time inputs
	gametimeFrom = $('#gametime-from').durationPicker({
		minutes: {
			label: 'm',
			min: 0,
			max: 59
		},
		seconds: {
			label: 's',
			min: 0,
			max: 59
		},
		type: 'number',
		classname: 'gametime-picker'
	});
	gametimeTo = $('#gametime-to').durationPicker({
		minutes: {
			label: 'm',
			min: 0,
			max: 59
		},
		seconds: {
			label: 's',
			min: 0,
			max: 59
		},
		type: 'number',
		classname: 'gametime-picker'
	});
	// Force time input maximums and minimums on blur
	$('.durationpicker-duration').on('blur', function() {
		if (parseInt($(this).val()) > $(this).attr('max')) {
			$(this).val($(this).attr('max'));
		} else if (parseInt($(this).val()) < $(this).attr('min')) {
			$(this).val($(this).attr('min'));
		}
	});
	court_lines();
	shot_heatmap();
	var btnSave = document.getElementById('btn-save');
	btnSave.addEventListener('click', function(e) {
		var canvasExp = document.getElementById('export'),
			canvasCourt = document.getElementById('court'),
			canvasShots = document.getElementById('shots');
		var ctxExp = canvasExp.getContext('2d');
		ctxExp.clearRect(0, 0, cols, rows);
		ctxExp.drawImage(canvasCourt, 0, 0);
		ctxExp.drawImage(canvasShots, 0, 0);
		btnSave.href = canvasExp.toDataURL();
		btnSave.download = document.getElementById('save-text').value === "" ? "heatmap" : document.getElementById('save-text').value;
		ctxExp.clearRect(0, 0, cols, rows);
	});
});

function load_selection(mainColumn, id, kwargs) {
	var kwurl = kwargs !== undefined ? Object.keys(kwargs).map(function(k){return "&"+k+"="+kwargs[k]}).join('') : ""
	var url = "/col_values?main="+mainColumn+kwurl
	d3.csv(url, function(data) {
		var select = d3.select("select#"+id);

		select.append("option")
			.text("All");

		select.selectAll("option")
			.data(data).enter()
			.append("option")
			.attr("data-value", function(d) {return d[mainColumn];})
			.attr("data-tokens", function(d) {return kwargs !== undefined ? Object.values(kwargs).map(function(v){return d[v];}).join(' ') : "";})
			.text(function(d) {return d[mainColumn];});

		$('select#'+id).selectpicker('refresh');
	});
}

function update_url() {
	var conf = $('#conf option:selected').data('value'),
		division = $('#division option:selected').data('value'),
		team = $('#team option:selected').data('value'),
		season = $('#season option:selected').data('value'),
		period = $('#period option:selected').data('value'),
		timeFrom = gametime_to_seconds($('#gametime-from').val().split(',')),
		timeTo = gametime_to_seconds($('#gametime-to').val().split(',')),
		made = $('#made option:selected').data('value'),
		type = $('#shot_type option:selected').data('value'),
		points = $('#shot_value option:selected').data('value');

	return URL_BASE + "/query?" +
		(conf !== undefined ? "&team_conf_alias={0}".format(conf) : "") +
		(division !== undefined ? "&team_division_alias={0}".format(division) : "") +
		(team !== undefined ? "&team_market={0}".format(team) : "") +
		(season !== undefined ? "&season={0}".format(season) : "") +
		(period !== undefined ? "&period={0}".format(period) : "") +
		(timeFrom !== 0 ? "&time_from={0}".format(timeFrom) : "") +
		(timeTo !== 0 ? "&time_to={0}".format(timeTo) : "") +
		(made !== undefined ? "&shot_made={0}".format(made) : "") +
		(type !== undefined ? "&shot_type={0}".format(type) : "") +
		(points !== undefined ? "&three_point_shot={0}".format(points) : "");

		//(timeFrom != 0 ? "&time_from=" : "") + (timeFrom != 0 ? timeFrom : "") +
}

function shot_heatmap() {
	$('#btn-draw').attr('disabled', true);
	$('#btn-save').attr('aria-disabled', true);
	$('#btn-save').toggleClass('disabled');
	$('#btn-draw').html('<i class="fas fa-spinner fa-pulse"></i> drawing...');
	var colorScale = d3.scaleSequential().interpolator(interpolateColor),
		logScale = d3.scaleLog().base(10),
		duration = 1000,
		ease = d3.easeCubic;

	var url = update_url();

	//	Main svg element
	d3.csv(url, function(d) {
		return {
			x: +d.x,
			y: +d.y,
			count: +d.count
		};
	}, function(error, data) {
		colorScale.domain([0, 1000]);
		var dataMax = d3.max(data, function(d) {return d.count;});
		logScale.domain([1, dataMax]).range([0, 1000]);
		context.clearRect(0, 0, cols, rows);

		yScale.domain([1, dataMax]);
		svg.select('.axis').transition().duration(duration).call(yAxis);

		var t = d3.timer(function(elapsed) {
			var time = Math.min(1, ease(elapsed/duration));

			context.clearRect(0, 0, cols, rows);

			data.forEach(function(d) {
				var color = d3.rgb(colorScale(logScale(d.count)));
				color.opacity = time*0.8;
				context.fillStyle = color;
				context.fillRect(d.x*4, d.y*4, cellWidth, cellHeight);
			});
			if (time === 1) {
				$('#btn-draw').attr('disabled', false);
				$('#btn-save').attr('aria-disabled', false);
				$('#btn-save').toggleClass('disabled');
				$('#btn-draw').html('Draw Shots');
				t.stop();
			}
		});
	});
}

function reset_selections() {
	$('.selectpicker').selectpicker('val', 'All');
	gametimeFrom.setvalues({minutes: 0, seconds: 0});
	gametimeTo.setvalues({minutes: 0, seconds: 0});
}

function gametime_to_seconds(gametime) {
	return parseInt(gametime[0].match(/\d+(?!\\s)/))*60 + parseInt(gametime[1].match(/\d+(?!\\s)/)) 
}

function court_lines() {
	var courtext = court.node().getContext("2d");

	courtext.fillStyle = "#fff";
	courtext.fillRect(0, 0, cols, rows);

	/*
	courtext.beginPath();
	courtext.lineWidth = "4";
	courtext.strokeStyle = "#000";
	courtext.rect(0, 0, cols, rows);
	courtext.stroke();
	*/
	var lineWidthOffset = 0.5;
	courtext.lineWidth = "2";
	courtext.strokeStyle = "#000";
	courtext.fillStyle = "#000";

	//// Left side
	//Free throw lane
	courtext.beginPath();
	courtext.moveTo(0, 226+lineWidthOffset);
	courtext.lineTo(228+lineWidthOffset, 226+lineWidthOffset);
	courtext.lineTo(228+lineWidthOffset, 374-lineWidthOffset);
	courtext.lineTo(0, 374-lineWidthOffset);
	courtext.stroke();

	//Free throw lane top marks
	courtext.beginPath();
	courtext.rect(84+lineWidthOffset, 218+lineWidthOffset, 12, 8);
	courtext.fill();

	courtext.moveTo(132+lineWidthOffset, 218);
	courtext.lineTo(132+lineWidthOffset, 226);

	courtext.moveTo(170+lineWidthOffset, 218);
	courtext.lineTo(170+lineWidthOffset, 226);

	courtext.moveTo(208+lineWidthOffset, 218);
	courtext.lineTo(208+lineWidthOffset, 226);
	courtext.stroke();

	//Free throw lane bottom marks
	courtext.beginPath();
	courtext.rect(84+lineWidthOffset, 374+lineWidthOffset, 12, 8);
	courtext.fill();

	courtext.moveTo(132+lineWidthOffset, 372);
	courtext.lineTo(132+lineWidthOffset, 380);

	courtext.moveTo(170+lineWidthOffset, 372);
	courtext.lineTo(170+lineWidthOffset, 380);

	courtext.moveTo(208+lineWidthOffset, 372);
	courtext.lineTo(208+lineWidthOffset, 380);
	courtext.stroke();

	//Free throw arc
	courtext.beginPath();
	courtext.arc(228, 300, 74-lineWidthOffset, 1.5*Math.PI, 0.5*Math.PI);
	courtext.stroke();

	//Three point line
	courtext.beginPath();
	courtext.moveTo(0, 51+lineWidthOffset);
	courtext.lineTo(63, 51+lineWidthOffset);

	courtext.moveTo(0, 549-lineWidthOffset);
	courtext.lineTo(63, 549-lineWidthOffset);
	courtext.stroke();

	courtext.beginPath();
	courtext.arc(63, 300, 249-lineWidthOffset, 1.5*Math.PI, 0.5*Math.PI);
	courtext.stroke();

	//Hoop and backboard
	courtext.beginPath();
	courtext.arc(63, 300, 9-lineWidthOffset, 0, 2*Math.PI);
	courtext.stroke();

	courtext.beginPath();
	courtext.moveTo(46+lineWidthOffset, 264);
	courtext.lineTo(46+lineWidthOffset, 336);
	courtext.stroke();

	//Restricted area
	courtext.beginPath();
	courtext.arc(63, 300, 48+lineWidthOffset, 1.5*Math.PI, 0.5*Math.PI);
	courtext.stroke();

	courtext.beginPath();
	courtext.moveTo(48, 251+lineWidthOffset);
	courtext.lineTo(63, 251+lineWidthOffset);
	courtext.stroke();

	courtext.beginPath();
	courtext.moveTo(48, 348+lineWidthOffset);
	courtext.lineTo(63, 348+lineWidthOffset);
	courtext.stroke();

	//// Right side
	//Free throw lane
	courtext.beginPath();
	courtext.moveTo(1128, 226+lineWidthOffset);
	courtext.lineTo(900-lineWidthOffset, 226+lineWidthOffset);
	courtext.lineTo(900-lineWidthOffset, 374-lineWidthOffset);
	courtext.lineTo(1128, 374-lineWidthOffset);
	courtext.stroke();

	//Free throw lane top marks
	courtext.beginPath();
	courtext.rect(1044-lineWidthOffset, 218+lineWidthOffset, 12, 8);
	courtext.fill();

	courtext.moveTo(996-lineWidthOffset, 218);
	courtext.lineTo(996-lineWidthOffset, 226);

	courtext.moveTo(958-lineWidthOffset, 218);
	courtext.lineTo(958-lineWidthOffset, 226);

	courtext.moveTo(920-lineWidthOffset, 218);
	courtext.lineTo(920-lineWidthOffset, 226);
	courtext.stroke();

	//Free throw lane bottom marks
	courtext.beginPath();
	courtext.rect(1044-lineWidthOffset, 374+lineWidthOffset, 12, 8);
	courtext.fill();

	courtext.moveTo(996-lineWidthOffset, 372);
	courtext.lineTo(996-lineWidthOffset, 380);

	courtext.moveTo(958-lineWidthOffset, 372);
	courtext.lineTo(958-lineWidthOffset, 380);

	courtext.moveTo(920-lineWidthOffset, 372);
	courtext.lineTo(920-lineWidthOffset, 380);
	courtext.stroke();

	//Free throw arc
	courtext.beginPath();
	courtext.arc(900, 300, 74-lineWidthOffset, 0.5*Math.PI, 1.5*Math.PI);
	courtext.stroke();

	//Three point line
	courtext.beginPath();
	courtext.moveTo(1128, 51+lineWidthOffset);
	courtext.lineTo(1065, 51+lineWidthOffset);

	courtext.moveTo(1128, 549-lineWidthOffset);
	courtext.lineTo(1065, 549-lineWidthOffset);
	courtext.stroke();

	courtext.beginPath();
	courtext.arc(1065, 300, 249-lineWidthOffset, 0.5*Math.PI, 1.5*Math.PI);
	courtext.stroke();

	//Hoop and backboard
	courtext.beginPath();
	courtext.arc(1065, 300, 9-lineWidthOffset, 0, 2*Math.PI);
	courtext.stroke();

	courtext.beginPath();
	courtext.moveTo(1082-lineWidthOffset, 264);
	courtext.lineTo(1082-lineWidthOffset, 336);
	courtext.stroke();

	//Restricted area
	courtext.beginPath();
	courtext.arc(1065, 300, 48+lineWidthOffset, 0.5*Math.PI, 1.5*Math.PI);
	courtext.stroke();

	courtext.beginPath();
	courtext.moveTo(1080, 251+lineWidthOffset);
	courtext.lineTo(1065, 251+lineWidthOffset);
	courtext.stroke();

	courtext.beginPath();
	courtext.moveTo(1080, 348+lineWidthOffset);
	courtext.lineTo(1065, 348+lineWidthOffset);
	courtext.stroke();

	////Center
	//Division line
	courtext.beginPath();
	courtext.moveTo(563+lineWidthOffset, 0);
	courtext.lineTo(563+lineWidthOffset, 600);
	courtext.stroke();

	//Center circle
	courtext.beginPath();
	courtext.arc(564, 300, 72-lineWidthOffset, 0, 2*Math.PI);
	courtext.stroke();
}