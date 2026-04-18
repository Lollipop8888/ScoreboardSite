---
trigger: always_on
---

Whenever you make any change to the main database (scoreboard.db), make a backup copy first.  This is a production database.
Also, whenever doing data migrations (e.g. create new table, insert into new table from old table, drop old table), DO NOT drop the old table.  rename it to e.g. <old_table_name_YYYYMMDD> and leave it.   Do not ever delete any data.  I will clean it up if necessary manually.