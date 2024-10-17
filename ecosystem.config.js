module.exports = {
    apps : [
    {
      name   : "server",
      script : "./server.js",
      error_file : "./UI_data/logs/err.log",
      out_file : "./UI_data/logs/out.log"
    },
    {
      name   : "reviewerDocStatusCronScheduler",
      script : "./reviewerDocStatusCronScheduler.js",
      error_file : "./UI_data/logs/errorUnlock.log",
      out_file : "./UI_data/logs/unlock.log"
    },
    {
      name   : "updateDataToSqlCronScheduler",
      script : "./updateDataToSqlCronScheduler.js",
      error_file : "./UI_data/logs/errorSql.log",
      out_file : "./UI_data/logs/sql.log"
    }
    ]
  }