const path = require("path");
const { response } = require("express");
const express = require("express");
const hbs = require("express-handlebars");
const { Server: HttpServer } = require("http");
const { normalize, schema } = require("normalizr");
const util = require("util");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const { ne } = require("faker/lib/locales");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const { userDaos: User } = require("./daos/mainDaos");
const script = require("bcrypt");
const saltRounds = 10;

const MongoStore = require("connect-mongo");
const Usuario = require("./daos/userDaos");
const advancedOptions = { useNewUrlParser: true, useUniFiedTopology: true };

const app = express();
const httpServer = new HttpServer(app);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cookieParser());
app.use(
  session({
    store: MongoStore.create({
      mongoUrl:
        "mongodb+srv://ramiro:ramiro12345@cluster0.so7yn.mongodb.net/coder?retryWrites=true&w=majority",
      mongoOptions: advancedOptions,
      ttl: 30,
    }),
    secret: "secreto",
    resave: true,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

//passport

passport.use(
  "register",

  new LocalStrategy(
    { passReqToCallback: true },
    async (req, username, password, done) => {
      console.log("entro signup");

      const usuarioDB = new Usuario();

      script.hash(password, saltRounds, async function (err, hash) {
        await usuarioDB.save({ mail: username, password: hash });
      });

      done(null, { mail: username });
    }
  )
);
passport.use(
  "login",
  new LocalStrategy(async (username, password, done) => {
    let existe;

    const usuarioDB = new User();

    const userDB = await usuarioDB.getByUser(username);

    script.compare(password, userDB?.password ?? "", function (err, result) {
      existe = result;
      if (!existe) {
        return done(null, false);
      } else {
        //console.log(existe)
        return done(null, existe);
      }
    });

    console.log(userDB);
  })
);

passport.serializeUser((user, done) => {
  //console.log(user + 'serializado')
  done(null, user);
});

passport.deserializeUser((nombre, done) => {
  const usuarioDz = nombre;
  //console.log(JSON.stringify(usuarioDz) + 'desserializado')
  done(null, usuarioDz);
});

/*----------- Motor de plantillas -----------*/
app.set("views", "./src/views");

app.engine(
  ".hbs",
  hbs.engine({
    defaultLayout: "main",
    layoutsDir: "./src/views/layouts",
    extname: ".hbs",
  })
);
app.set("view engine", ".hbs");

//rutas

app.get("/login", (req, res) => {
  req.logOut();
  res.render("login");
});

app.get("/registrar", (req, res) => {
  res.render("register");
});

app.post(
  "/register",
  passport.authenticate("register", {
    successRedirect: "/login",
    failureRedirect: "/login-error",
  })
);

app.post(
  "/login",
  passport.authenticate("login", {
    successRedirect: "/datos",
    failureRedirect: "/login-error",
  })
);

app.get("/login-error", (req, res) => {
  res.render("login-error");
});

app.get("/datos", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

app.get("/logout", (req, res) => {
  req.logOut();

  res.redirect("/login");
});

app.use(express.static("./public"));
app.get("/todo", (req, res) => {
  res.sendFile("index.html");
});

/* Server Listen */
const PORT = process.env.PORT || 8080;
const server = httpServer.listen(PORT, () =>
  console.log(`servidor Levantado ${PORT}`)
);
server.on("error", (error) => console.log(`Error en servidor ${error}`));
