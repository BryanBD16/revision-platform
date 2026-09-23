#!/bin/bash
# Creates a separate database for integration tests and grants the
# application user access to it. Runs once, on first volume initialization.
#
# The MySQL image entrypoint sources this file (it is not executed), so it
# must not change shell options; docker_process_sql is provided by the
# entrypoint and connects as root.

docker_process_sql --database=mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_test\`;
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}_test\`.* TO '${MYSQL_USER}'@'%';
SQL
