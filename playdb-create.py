import os
import csv
import glob
import sqlite3

# Used for setting up database(s) from downloaded Google Bigquery data

PLAY_DB = 'ncaam-plays.db'
SHOT_DB = 'ncaam-shots.db'

def main():
	#init_play_db()
	#fill_play_db()
	#testing()
	init_shot_db()
	fill_shot_db()

def init_shot_db():
	conn = sqlite3.connect(SHOT_DB)
	cur = conn.cursor()
	cur.execute("DROP TABLE IF EXISTS shot")
	cur.execute("""CREATE TABLE shot
				(season	INTEGER,
				scheduled_date	TEXT,
				venue_name	TEXT,
				venue_city	TEXT,
				venue_state	TEXT,
				conference_game	INTEGER,
				tournament	TEXT,
				tournament_type	TEXT,
				round	TEXT,
				game_no	TEXT,
				away_market	TEXT,
				away_name	TEXT,
				away_id	TEXT,
				away_alias	TEXT,
				away_conf_name	TEXT,
				away_conf_alias	TEXT,
				away_division_alias	TEXT,
				home_market	TEXT,
				home_name	TEXT,
				home_id	TEXT,
				home_alias	TEXT,
				home_conf_name	TEXT,
				home_conf_alias	TEXT,
				home_division_alias	TEXT,
				period	INTEGER,
				elapsed_time_sec	INTEGER,
				team_name	TEXT,
				team_market	TEXT,
				team_id	TEXT,
				team_alias	TEXT,
				team_conf_name	TEXT,
				team_conf_alias	TEXT,
				team_division_alias	TEXT,
				team_basket	TEXT,
				player_full_name	TEXT,
				event_coord_x	REAL,
				event_coord_y	REAL,
				event_type	TEXT,
				type	TEXT,
				shot_made	INTEGER,
				shot_type	TEXT,
				shot_subtype	TEXT,
				three_point_shot	INTEGER,
				points_scored	REAL)""")
	conn.commit()
	conn.close()

def fill_shot_db():
	playConn = sqlite3.connect(PLAY_DB)
	playCur = playConn.cursor()
	conn = sqlite3.connect(SHOT_DB)
	cur = conn.cursor()
	for offset in range(0,1500000,10000):
		print("Selecting and inserting shots {} through {}".format(offset, offset+10000))
		playCur.execute("SELECT season,scheduled_date,venue_name,venue_city,venue_state,conference_game,tournament,tournament_type,round,game_no,away_market,away_name,away_id,away_alias,away_conf_name,away_conf_alias,away_division_alias,home_market,home_name,home_id,home_alias,home_conf_name,home_conf_alias,home_division_alias,period,elapsed_time_sec,team_name,team_market,team_id,team_alias,team_conf_name,team_conf_alias,team_division_alias,team_basket,player_full_name,event_coord_x,event_coord_y,event_type,type,shot_made,shot_type,shot_subtype,three_point_shot,points_scored FROM play WHERE type='fieldgoal' LIMIT 10000 OFFSET ?",(offset,))
		playConn.commit()
		rows = playCur.fetchall()
		cur.executemany("INSERT INTO shot VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(row for row in rows))
		conn.commit()
	playConn.close()
	conn.close()
	print("Done")

def testing():
	conn = sqlite3.connect(PLAY_DB)
	cur = conn.cursor()
	cur.execute("SELECT event_coord_x,event_coord_y FROM play WHERE type='fieldgoal' LIMIT 10")
	for row in cur.fetchall():
		print("{}\t{}".format(row[0],row[1]))
	conn.commit()
	conn.close()

def init_play_db():
	conn = sqlite3.connect(PLAY_DB)
	cur = conn.cursor()
	cur.execute("DROP TABLE IF EXISTS play")
	cur.execute("""CREATE TABLE play
				(game_id	TEXT,
				load_timestamp	TEXT,
				season	INTEGER,
				status	TEXT,
				scheduled_date	TEXT,
				venue_id	TEXT,
				venue_name	TEXT,
				venue_city	TEXT,
				venue_state	TEXT,
				venue_address	TEXT,
				venue_zip	TEXT,
				venue_country	TEXT,
				venue_capacity	INTEGER,
				attendance	INTEGER,
				neutral_site	INTEGER,
				conference_game	INTEGER,
				tournament	TEXT,
				tournament_type	TEXT,
				round	TEXT,
				game_no	TEXT,
				away_market	TEXT,
				away_name	TEXT,
				away_id	TEXT,
				away_alias	TEXT,
				away_conf_name	TEXT,
				away_conf_alias	TEXT,
				away_division_name	TEXT,
				away_division_alias	TEXT,
				away_league_name	TEXT,
				home_market	TEXT,
				home_name	TEXT,
				home_id	TEXT,
				home_alias	TEXT,
				home_conf_name	TEXT,
				home_conf_alias	TEXT,
				home_division_name	TEXT,
				home_division_alias	TEXT,
				home_league_name	TEXT,
				period	INTEGER,
				game_clock	TEXT,
				elapsed_time_sec	INTEGER,
				possession_arrow	TEXT,
				team_name	TEXT,
				team_market	TEXT,
				team_id	TEXT,
				team_alias	TEXT,
				team_conf_name	TEXT,
				team_conf_alias	TEXT,
				team_division_name	TEXT,
				team_division_alias	TEXT,
				team_league_name	TEXT,
				team_basket	TEXT,
				possession_team_id	TEXT,
				player_id	TEXT,
				player_full_name	TEXT,
				jersey_num	INTEGER,
				event_id	TEXT,
				timestamp	TEXT,
				event_description	TEXT,
				event_coord_x	REAL,
				event_coord_y	REAL,
				event_type	TEXT,
				type	TEXT,
				shot_made	INTEGER,
				shot_type	TEXT,
				shot_subtype	TEXT,
				three_point_shot	INTEGER,
				points_scored	REAL,
				turnover_type	TEXT,
				rebound_type	TEXT,
				timeout_duration	REAL)""")

def fill_play_db():
	conn = sqlite3.connect(PLAY_DB)
	cur = conn.cursor()
	count = 1
	for csvfile in glob.glob(os.path.join('all-shots', '*.csv')):
		print("Inserting file {} of 94".format(count))
		with open(csvfile, 'r') as f:
			reader = csv.reader(f.readlines()[1:])
			cur.executemany("INSERT INTO play VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (row for row in reader))
		count += 1

	conn.commit()
	conn.close()

if __name__ == "__main__":
	main()