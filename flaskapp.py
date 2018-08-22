import sqlite3
import time

from flask import Flask, request, g, render_template

DATABASE = '/home/jbovee/deploy/ncaam-shots.db'

app = Flask(__name__, template_folder='static/html/')
app.config.from_object(__name__)

def conn_to_db():
	return sqlite3.connect(app.config['DATABASE'])

def get_db():
	db = getattr(g, 'db', None)
	if db is None:
		db = g.db = conn_to_db()
	return db

@app.teardown_appcontext
def close_conn(exception):
	db = getattr(g, 'db', None)
	if db is not None:
		db.close()

def execute_query_no_args(query):
	cur = get_db().execute(query)
	rows = cur.fetchall()
	cur.close()
	return rows

def execute_query(query, args=()):
	cur = get_db().execute(query, args)
	rows = cur.fetchall()
	cur.close()
	return rows

@app.route("/")
def index():
	return render_template("index.html")

@app.route("/col_values")
def col_values():
	cur = get_db().cursor()

	mainCol = request.args.get('main')
	allCols = [value for value in request.args.values()]
	query = """
			SELECT DISTINCT {0}
			FROM shot
			GROUP BY {1}
			ORDER BY {1}
	""".format(','.join(allCols), mainCol)

	result = execute_query_no_args(query)
	strRows = [','.join(map(str, row)) for row in result]
	cur.close()
	header = ','.join(allCols)+'\n'
	return header + '\n'.join(strRows)

@app.route("/query")
def print_data():
	startTime = time.time()
	cur = get_db().cursor()

	keys = ['elapsed_time_sec>=?' if key == 'time_from' else 'elapsed_time_sec<=?' if key == 'time_to' else '{}=?'.format(key) for key in request.args.keys()]
	values = [value for value in request.args.values()]

	query = """
			SELECT
				CASE team_basket WHEN 'left' THEN CAST(event_coord_x/4 AS INT) ELSE CAST(ABS(event_coord_x-1128)/4 AS INT) END x,
				CASE team_basket WHEN 'left' THEN CAST(event_coord_y/4 AS INT) ELSE CAST(ABS(event_coord_y-600)/4 AS INT) END y,
				COUNT(*)
			FROM shot
			WHERE """ + ' AND '.join(keys) + """ GROUP BY x,y"""

	''' Query returning shots on both sides
	query = """
			SELECT
				CAST(event_coord_x/4 AS INT) AS x,
				CAST(event_coord_y/4 AS INT) AS y,
				COUNT(*)
			FROM shot
			WHERE """ + ' AND '.join(keys) + """ GROUP BY x,y"""
	'''

	query_no_args = """
			SELECT
				CASE team_basket WHEN 'left' THEN CAST(event_coord_x/4 AS INT) ELSE CAST(ABS(event_coord_x-1128)/4 AS INT) END x,
				CASE team_basket WHEN 'left' THEN CAST(event_coord_y/4 AS INT) ELSE CAST(ABS(event_coord_y-600)/4 AS INT) END y,
				COUNT(*)
			FROM shot
			GROUP BY x,y
			"""

	result = execute_query(query, (values)) if (keys and values) else execute_query_no_args(query_no_args)
	strRows = [','.join(map(str, row)) for row in result]
	queryTime = time.time() - startTime
	cur.close()
	header = 'x,y,count\n'
	return header + '\n'.join(strRows)

if __name__ == "__main__":
	#app.run(host='0.0.0.0', port=5000, debug=True)
	app.run()