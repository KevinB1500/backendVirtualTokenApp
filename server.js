const express = require('express');
const mysql = require('mysql');
const randomstring = require('randomstring');

// Crear una conexión a la base de datos
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'virtualtoken'
});

const createTableSQL = `
CREATE TABLE tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente VARCHAR(255) NOT NULL,
  token VARCHAR(6) NOT NULL,
  expira_en BIGINT NOT NULL,
  uso TINYINT NOT NULL DEFAULT 0
);
`;

connection.query(createTableSQL, (err, result) => {
  if (err) {
    console.error("Error creando la tabla: " + err.message);
  } else {
    console.log("Tabla creada exitosamente");
  }
});

const app = express();
app.use(express.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const repeatFunction = ({cliente}) =>{
    const token = randomstring.generate({ length: 6, charset: 'numeric' });
    console.log(cliente)
    connection.query(
      'INSERT INTO tokens (cliente, token, expira_en) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 60 SECOND))',
      [cliente, token],
      (error) => {
        if (error) throw error;
        console.log({ token });
      }
    );
    return token;
};

// Endpoint para generar el token
app.get('/generarToken/', (req, res) => {
  const cliente = req.query.cliente;
  connection.query(
    'SELECT * FROM tokens WHERE cliente = ?',
    [cliente],
    (error, results)=>{
        if (error) throw error;
        //Si existe el cliente
        if(results.length>0){
            connection.query(
                'SELECT * FROM tokens WHERE cliente = ? AND expira_en > NOW()',
                [cliente],
                (error, results) => {
                    if (error) throw error;
                    res.send({ token: results[0].token, tiempoRestante: results[0].expira_en });
                }
            )
        }
        //Si no existe el cliente
        else{
            let token = repeatFunction({cliente});
            res.send({ token });
            setInterval(()=>repeatFunction({cliente}), 60 * 1000);
        }
    }
    
  );
});

// Endpoint para usar el token
app.get('/usarToken/', (req, res) => {
  const cliente = req.query.cliente;
  const token = req.query.token;
  connection.query(
    'SELECT * FROM tokens WHERE cliente = ? AND token = ? AND expira_en > NOW()',
    [cliente, token],
    (error, results) => {
      if (error) throw error;
      if (results.length > 0) {
        // Si el token es válido, autenticar al cliente y regresar una respuesta positiva
        res.send({ autenticado: true });
        connection.query(
          'UPDATE tokens SET uso = 1 WHERE cliente = ? AND token = ?',
          [cliente, token],
          (error, results) => {
              if (error) throw error;
              console.log("Token usado, fila modificada.")
          }
      )


      } else {
        // Si el token no es válido, regresar una respuesta negativa
        res.send({ autenticado: false });
      }
    }
  );
});

// Escuchar en el puerto 4000
app.listen(4000, () => {
  console.log('Escuchando en el puerto 4000');
});
