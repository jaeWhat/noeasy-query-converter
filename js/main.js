document.addEventListener("DOMContentLoaded", () => {
  // Component
  const txtInfo = document.getElementById("txtInfo");
  const queryInfo = document.getElementById("queryInfo");

  const inputQuery = document.getElementById("inputQuery");
  const outputQuery = document.getElementById("outputQuery");

  const btnClear = document.getElementById("btnClear");
  const btnConvert = document.getElementById("btnConvert");
  const btnCopy = document.getElementById("btnCopy");
  const btnReset = document.getElementById("btnReset");

  // EvernListener
  btnConvert.addEventListener("click", () => {
    const sql = inputQuery.value.trim().toUpperCase();

    switch (validQuery(sql)) {
      case "SELECT":
        txtInfo.value = "🔍 SELECT 쿼리를 감지했습니다.";
        convertSelectQuery(sql);
        break;

      case "INSERT":
        txtInfo.value = "➕ INSERT 쿼리를 감지했습니다.";
        convertInsertQuery(sql);
        break;

      case "UPDATE":
        txtInfo.value = "✏️ UPDATE 쿼리를 감지했습니다.";
        convertUpdateQuery(sql);
        break;

      case "DELETE":
        txtInfo.value = "🗑️ DELETE 쿼리를 감지했습니다.";
        convertDeleteQuery(sql);
        break;

      default:
        txtInfo.value = "⚠️ 알 수 없는 쿼리입니다.";
        outputQuery.value = "";
        inputQuery.value = "";
        queryInfo.value = "";
        break;
    }
  });

  btnClear.addEventListener("click", () => {
    handleReset();
  });

  btnCopy.addEventListener("click", () => {
    if (outputQuery.value) {
      navigator.clipboard.writeText(outputQuery.value)
        .then(() => {
          alert("복사 완료!");
        })
        .catch(err => {
          console.error("복사 실패:", err);
        });
    } else {
      alert("복사 완료!");
    }
  });

  btnReset.addEventListener("click", () => {
    outputQuery.value = "";
    handleReset();
  });

  // Function
  const toCamelCase = (str) => {
    return str
      .toLowerCase()
      .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  const handleReset = () => {
    inputQuery.value = "";
    queryInfo.value = "";
    txtInfo.value = "";
  }

  const validQuery = (sql) => {
    // Validation
    if (sql === "") {
      return "ERROR"
      // txtInfo.value = "⚠️ 알 수 없는 쿼리입니다.";
    } else {
      queryInfo.value = sql;
    }

    if (/select\s+[\s\S]+?\s+from\s+/i.test(sql)) {
      return "SELECT";
    }
    if (/insert\s+into\s+[\[\]\w.]+\s*\([\s\S]+?\)\s*/i.test(sql)) {
      return "INSERT";
    }
    if (/update\s+[\[\]\w.]+\s+set\s+/i.test(sql)) {
      return "UPDATE";
    }
    if (/delete\s+from\s+[\[\]\w.]+/i.test(sql)) {
      return "DELETE";
    }
  }

  const convertSelectQuery = (sql) => {
    // sql = `
    // SELECT A.COMM_CODE AS commCode,
    //   A.COMM_NAME AS commName
    // FROM T_COMM_CODE WITH (NOLOCK)
    // WHERE COMM_CODE = #{commCode}
    //   AND COMM_NAME = #{commName}
    // `;

    // Select Field
    let selectField = "";
    const selectMatch = sql.match(/select\s+([\s\S]+?)\s+from\s+/i);
    if (!selectMatch) {
      txtInfo.value = '⚠️ SELECT ~ FROM 구문을 찾을 수 없습니다.';
      return;
    } else {
      const selectColumns = selectMatch[1].trim()
        .split(',')
        .map(col => col.replace(/[\n\t\r]/g, '').trim())
        .filter(col => col !== "*" && col.length > 0);

      selectField = selectColumns.map(e => {
        const fieldCode = e.split("AS") ? e.split("AS")[0].trim() : e.trim();
        const fieldName = fieldCode.indexOf('.') ? fieldCode.substring(fieldCode.indexOf('.') + 1, fieldCode.length) : fieldCode;

        return `${fieldCode} AS ${toCamelCase(fieldName)}`;
      });
    }

    // Table Name
    let tableName = "";
    const fromMatch = sql.match(/from\s+([\s\S]*)/i); // *는 끝까지
    if (!fromMatch) {
      txtInfo.value = '⚠️ FROM ~ 구문을 찾을 수 없습니다.';
      return;
    } else {
      tableName = fromMatch[1].trim();

      const withNoLockMatch = `${tableName}`.match(/with\s*\(nolock\)/i);
      if (withNoLockMatch) {
        tableName = tableName.substring(0, withNoLockMatch.index - 1).trim();
      } else if (!withNoLockMatch && tableName.indexOf("WHERE") > 0) {
        tableName = tableName.substring(0, tableName.indexOf("WHERE") - 1).trim();
      }

      tableName = `${tableName} WITH (NOLOCK)`;
    }

    // Where Field
    let whereField = "";
    const whereMatch = sql.match(/where\s+([\s\S]*)/i); // *는 끝까지
    if (whereMatch) {
      const whereColumns = whereMatch[1].replace(/<[^>]+>/gi, '').trim().split('AND');
      const filteredWhereColumns = whereColumns.filter(s => s.indexOf("1 = 1") === -1);

      whereField = filteredWhereColumns.map(e => {
        if (e.split("=")) {
          const columnName = `${e.split("=")[0].trim()}`;
          const columnValue = `${toCamelCase(columnName)}`;

          return `<if test="${columnValue} != null and ${columnValue} != ''">\n` +
            `\tAND ${columnName} = #{${columnValue}}\n` +
            `\t</if>`
            ;
        } else {
          const columnName = `${e.trim()}`;
          const columnValue = `${toCamelCase(columnName)}`;

          return `<if test="${columnValue} != null and ${columnValue} != ''">\n` +
            `\tAND ${columnName} = #{${columnValue}}\n` +
            `\t</if>`
            ;
        }
      });
    }

    outputQuery.value =
      `SELECT ${selectField.join(',\n\t')}\n` +
      `FROM ${tableName}\n` +
      (whereField ? `WHERE 1 = 1\n\t${whereField.join("\n\t")}\n` : '');
  }

  const convertInsertQuery = (sql) => {
    // sql = `
    // INSERT INTO T_COMM_CODE (
    //   COMM_CODE,
    //   COMM_NAME
    // ) VALUES(
    //   #{commCode},
    //   #{commName}
    // )
    // `;

    const insertMatch = sql.match(/insert\s+into\s+([\[\]\w.]+)\s*\(([\s\S]+?)\)\s*/i);

    // Table Name
    let tableName = "";
    let columnNames = "";
    let columnValues = "";
    if (!insertMatch) {
      txtInfo.value = '⚠️ INSERT INTO 구문을 찾을 수 없습니다.';
      return;
    } else {
      if (insertMatch[1]) {
        tableName = insertMatch[1].trim();
      }

      if (insertMatch[2]) {
        const insertColumns = insertMatch[2].split(',');
        const columnLength = insertColumns.length - 1;

        columnNames = insertColumns.map((e, i) => {
          const columnName = e.replace(/<[^>]+>/gi, '').trim();
          const columnValue = toCamelCase(columnName);

          return `<if test="${columnValue} != null and ${columnValue} != ''">\n` +
            `\t${columnName + (i !== columnLength ? ',' : '')}\n` +
            `\t</if>`
            ;
        });

        columnValues = insertColumns.map((e, i) => {
          const columnName = e.trim().replace(/<[^>]+>/gi, '');
          const columnValue = toCamelCase(columnName);

          return `<if test="${columnValue} != null and ${columnValue} != ''">\n` +
            `\t#{${toCamelCase(columnName)}}${(i !== columnLength ? ',' : '')}\n` +
            `\t</if>`
            ;
        });
      }
    }

    outputQuery.value =
      `INSERT INTO ${tableName} (\n` +
      `\t${columnNames.join('\n\t')}\n` +
      `) VALUES (\n` +
      `\t${columnValues.join('\n\t')}\n` +
      `)`;
  }

  const convertUpdateQuery = (sql) => {
    // sql = `
    // UPDATE T_COMM_CODE
    // SET
    //   COMM_CODE = #{commCode},
    //   COMM_NAME = #{commName}
    // WHERE COMM_CODE = #{commCode}
    //   AND COMM_NAME = #{commName}
    // `;

    // Table Name
    let tableName = "";
    const tableMatch = sql.match(/update\s+([\[\]\w.]+)\s+set\s+/i);
    if (!tableMatch) {
      txtInfo.value = '⚠️ UPDATE ~ SET 구문을 찾을 수 없습니다.';
      return;
    } else {
      tableName = tableMatch[1].trim();
    }

    // Update Field
    let updateField = "";
    const updateMatch = sql.match(/set\s+([\s\S]*)/i); // *는 끝까지
    if (updateMatch) {
      let updateMatchString = updateMatch[1].trim();
      const updateWhereMatch = updateMatch[1].match(/where/i);

      if (updateWhereMatch) {
        updateMatchString = updateMatchString.substring(0, updateWhereMatch.index);
      }

      const updateColumns = updateMatchString.trim().split(',');
      const columnLength = updateColumns.length - 1;

      updateField = updateColumns.map((e, i) => {
        if (e.split("=")) {
          const columnName = e.replace(/<[^>]+>/gi, '').split("=")[0].trim();
          const columnValue = toCamelCase(columnName);

          return `<if test="${columnValue} != null and ${columnValue} != ''">\n` +
            `\t${columnName} = #{${columnValue}}${(i !== columnLength ? ',' : '')}\n` +
            `\t</if>`;
        } else {
          const columnName = e.replace(/<[^>]+>/gi, '').trim();
          const columnValue = toCamelCase(columnName);

          return `<if test="${columnValue} != null and ${columnValue} != ''">\n` +
            `\t${columnName} = #{${columnValue}}${(i !== columnLength ? ',' : '')}\n` +
            `\t</if>`;
        }
      });
    }

    // Where Field
    let whereField = "";
    const whereMatch = sql.match(/where\s+([\s\S]*)/i); // *는 끝까지
    if (whereMatch) {
      const whereColumns = whereMatch[1].trim().split('AND');

      whereField = whereColumns.map(e => {
        if (e.split("=")) {
          const columnName = e.split("=")[0].trim();
          const columnValue = toCamelCase(e.split("=")[0].trim());

          return `${columnName} = #{${columnValue}}`;
        } else {
          const columnName = e.trim();
          const columnValue = toCamelCase(e.trim());

          return `${columnName} = #{${columnValue}}`;
        }
      });
    }

    outputQuery.value =
      `UPDATE ${tableName}\n` +
      (updateField ? `SET\n\t${updateField.join("\n\t")}\n` : '') +
      (whereField ? `WHERE ${whereField.join("\n\tAND ")}\n` : '');
  }

  const convertDeleteQuery = (sql) => {
    // sql = `
    // DELETE FROM T_COMM_CODE
    // WHERE COMM_CODE = #{commCode}
    //   AND COMM_NAME = #{commName}
    // `;

    // Table Name
    let tableName = "";
    const tableMatch = sql.match(/delete\s+from\s+([\[\]\w.]+)(\s+where\s+[\s\S]+)?/i);
    if (tableMatch) {
      tableName = tableMatch[1].trim();

      // Where Field
      let whereField = "";
      const whereMatch = sql.match(/where\s+([\s\S]*)/i); // *는 끝까지
      if (whereMatch) {
        const whereColumns = whereMatch[1].trim().split('AND');
  
        whereField = whereColumns.map(e => {
          if (e.split("=")) {
            const columnName = e.split("=")[0].trim();
            const columnValue = toCamelCase(e.split("=")[0].trim());
  
            return `${columnName} = #{${columnValue}}`;
          } else {
            const columnName = e.trim();
            const columnValue = toCamelCase(e.trim());
  
            return `${columnName} = #{${columnValue}}`;
          }
        });
      }
  
      outputQuery.value =
        `DELETE FROM ${tableName}\n` +
        (whereField ? `WHERE ${whereField.join("\n\tAND ")}\n` : '');
    }
  }
});