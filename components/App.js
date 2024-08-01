const atc = Vue.createApp({
  data() {
    return {
      rwAngle1: 0,
      rwAngle2: 180,
      rwNames: {
        top: "36",
        bot: "18"
      },
      waypoints: {},
      flights: {
        '1Departure': {},
        '2Arrival': {},
      },
      activesCallsigns: [],
      selectedFly: '',
      selectedType: '',
      selectedParams: {
        hdg: 0,
        wayP: '',
        spd: 0,
        alt: 0,
        takeoff: false,
        approachTo: '',
      },
      depAngle: 0,
      depPoint: {},
      Ymin: 0,
      Ymax: 0,
      winW: 1600,
      iniCoords: [],
      playInterval: null,
      refreshRate: 250,
      msgPanelTxt: "",
      inWarning: [],
      speak: {
        queue: [],
        speaking: false,
      },
      ilsDegDif: 15,
      ilsDist: 370, // Minimum 190
      ilsDrawsDtext: [],
      recalcqtty: 0,
      score: {
        points: 0,
        record: 0
      },
      completedFly: {
        dep: 0,
        arr: 0,
      },
    };
  },
  async mounted() {
    await this.crearLimitesY();
    await this.crearAnguloPista();
    await this.crearWayPoints(15);
    await this.crearAnguloDespegue();
    await this.crearVuelo(6);
    this.iniCoords = [];

    //Carga puntaje
    const record = localStorage.getItem("record");
    if (record === null) {
      // Si no existe, lo inicializamos con 0
      localStorage.setItem("record", 0);
    } else {
      this.score.record = record;
    }

    // Inicia el juego
    // this.runGame();

    // Evento Key para enviar comando
    document.addEventListener(
      "keyup",
      (event) => {
        if (event.keyCode === 13) {
          this.setCommandToFly();
        }
      },
    );

  },
  methods: {

    //TODO SECCION DE FUNCIONES CREADORAS

    // Angulo de pista al azar, entre 31 y 149 deg
    crearAnguloPista: function () {
      // Evita crear pistas verticales
      const angle = Math.floor(Math.random() * 148 + 16);
      const angle2 = angle + 180;

      this.rwAngle1 = angle;
      this.rwAngle2 = angle + 180;
      this.rwNames.bot = Math.round(angle / 10).toString().padStart(2, '0');
      this.rwNames.top = Math.round((angle2) / 10).toString().padStart(2, '0');
      this.crearZonaILS(0); // Se rotan después junto con la pista
      this.crearZonaILS(180);
    },

    // Crea textos para las zonas ILS del SVG
    crearZonaILS: function (angle) {
      // Inicializa la lista de puntos
      const points = [];
      // Calcula el punto de extremo de pista una sola vez
      const m = this.calcEndPos(800, 800, angle, 30);
      points.push([m.x, m.y]); // Agrega el primer punto

      // Pre-cálculo de valores constantes
      const difDeg = this.ilsDegDif; // Grados 
      const startAngle = angle - difDeg;
      const endAngle = angle + difDeg;
      const dist = this.ilsDist;

      // Crea puntos interiores cada 5 grados
      for (let h = endAngle; h >= startAngle; h -= 5) {
        let pnt = this.calcEndPos(m.x, m.y, h, 170);
        points.push([parseFloat(pnt.x.toFixed(1)), parseFloat(pnt.y.toFixed(1))]);
      }

      // Crea puntos exteriores cada 5 grados
      for (let i = startAngle; i <= endAngle; i += 5) {
        let pnt = this.calcEndPos(m.x, m.y, i, dist);
        points.push([parseFloat(pnt.x.toFixed(1)), parseFloat(pnt.y.toFixed(1))]);
      }

      // Construye la cadena dText utilizando reduce
      const dText = points.reduce((acc, [x, y], index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${acc} ${command}${x},${y}`;
      }, '') + " Z";

      // Agrega el texto final al array de dibujos ILS
      this.ilsDrawsDtext.push(dText);
    },

    // Crea los puntos VOR
    crearWayPoints: function (cant) {
      return new Promise((resolve) => {
        this.crearIlsWayPoints();
        const vocales = 'AEIOU';
        const consonantes = 'BCDFGHJKLMNPQRSTVWXYZ';
        let contador = 0;

        while (contador < cant) {
          // Generación de nombre de waypoint
          const wpName = `${consonantes.charAt(Math.floor(Math.random() * consonantes.length))}${vocales.charAt(Math.floor(Math.random() * vocales.length))}${consonantes.charAt(Math.floor(Math.random() * consonantes.length))}${vocales.charAt(Math.floor(Math.random() * vocales.length))}`;

          // Generación de coordenadas
          const x = Math.floor(Math.random() * 1500) + 100;
          const y = Math.floor(Math.random() * 1500) + 100;

          const xValid1 = (x > 20 && x < 700);
          const xValid2 = (x > 1000 && x < 1580);
          const yValid1 = (y > this.Ymin && y < 700);
          const yValid2 = (y > 1000 && y < this.Ymax);
          const waypointNotExist = !this.waypoints[wpName];

          if ((xValid1 || xValid2) && (yValid1 || yValid2) && waypointNotExist) {
            const esValido = Object.values(this.waypoints).every(puntoExistente => this.calcDist(x, y, puntoExistente.x, puntoExistente.y) >= 200);

            // Si el waypoint es válido y no existe un waypoint con el mismo nombre
            if (esValido) {
              this.waypoints[wpName] = { x, y };
              contador++;
            }
          }
        }
        resolve();
      });
    },

    // Crea el tamaño ajustado de pantalla y los límites verticales, en pixeles
    crearLimitesY: function () {
      const anchuraAjustada = window.innerWidth - 273;
      const alturaPantalla = window.innerHeight;
      // Normaliza la altura basada en la anchura del SVG (1600 pixeles)
      const alturaNormalizada = Math.round(1600 / anchuraAjustada * alturaPantalla);
      // Calcula la separación al origen ajustando la altura normalizada a la referencia
      const desplazamiento = Math.round((1600 - alturaNormalizada) / 2);

      // Establece los límites Y con un margen de 20 pixeles
      this.Ymin = desplazamiento + 20;
      this.Ymax = desplazamiento + alturaNormalizada - 20;
      // Almacena la anchura de la ventana ajustada
      this.winW = anchuraAjustada;
    },

    // Crea los wayPoints de Aproximacion e ILS a cada lado de la pista
    crearIlsWayPoints: function () {
      // Precálculo de valores trigonométricos basados en el ángulo de la pista
      const rads = this.rwAngle1 * Math.PI / 180;
      const sin = Math.sin(rads);
      const cos = Math.cos(rads);

      // Define la configuración de los waypoints con sus desplazamientos específicos
      const waypointsConfig = [
        { prefix: "A", delta: 500, namePart: this.rwNames.top },
        { prefix: "I", delta: 300, namePart: this.rwNames.top },
        { prefix: "A", delta: 500, namePart: this.rwNames.bot },
        { prefix: "I", delta: 300, namePart: this.rwNames.bot },
      ];

      waypointsConfig.forEach(wpConfig => {
        const wpName = wpConfig.prefix + wpConfig.namePart;
        // Calcula las diferencias basadas en si es parte superior o inferior
        const deltaX = Math.round(wpConfig.delta * sin);
        const deltaY = Math.round(wpConfig.delta * cos);
        // Ajuste de la posición para waypoints superiores e inferiores
        const x = 800 + (wpConfig.namePart === this.rwNames.top ? deltaX : -deltaX);
        const y = 800 - (wpConfig.namePart === this.rwNames.top ? deltaY : -deltaY);

        // Asigna el waypoint al objeto waypoints con el nombre generado
        this.waypoints[wpName] = { x, y };
      });
    },

    // Muestra un mensaje en el panel
    showMessage: function (msg) {
      this.msgPanelTxt = msg;
      setTimeout(() => {
        this.msgPanelTxt = '';
      }, 4000);
    },

    createUsedDepartureWP: function () {
      let used = [];
      for (fly in this.flights['1Departure']) {
        used.push(this.flights['1Departure'][fly].endPoint.name);
      }
      return used;
    },

    //! ** NO Optimizada
    crearVuelo: function (cant) {
      let created = false;
      // Obtener waypoints válidos
      const vocales = ['A', 'E', 'I', 'O', 'U'];
      const waypoints = this.waypoints
      const wpKeys = Object.keys(waypoints);
      const filteredWpKeys = wpKeys.filter(clave => !vocales.includes(clave[0]));
      let prevCoords = this.iniCoords;
      const Ymin = this.Ymin;
      const Ymax = this.Ymax;
      // Genera números de identifiacacion de vuelo
      function generarRdmId() {
        const longitud = Math.random() < 0.5 ? 3 : 4;
        let resultado = Math.floor(Math.random() * 9) + 1; // +1 asegura que el rango sea 1-9
        for (let i = 1; i < longitud; i++) {
          resultado += Math.floor(Math.random() * 10).toString();
        }
        return resultado.toString();
      };

      // Decide si es Departure o Arrival
      function generarTipo() {
        return Math.random() > 0.5 ? '1Departure' : '2Arrival';
      };

      // Genera origen aleatorio
      function generaOrigen() {
        let x = -200;
        let y = -200;
        const borders = ['t', 'b', 'r', 'l'];
        const rdm = Math.floor(Math.random() * borders.length);
        const origen = borders[rdm];
        const interval = Ymax - Ymin;
        switch (origen) {
          case 't':
            x = Math.floor(Math.random() * 1560) + 20;
            y = Ymin;
            break;
          case 'b':
            x = Math.floor(Math.random() * 1560) + 20;
            y = Ymax;
            break;
          case 'l':
            x = 20;
            y = Math.floor(Math.random() * interval) + Ymin;
            break;
          case 'r':
            x = 1580;
            y = Math.floor(Math.random() * interval) + Ymin;
            break;
        }

        return { 'x': x, 'y': y };
      };
      // Genera destino aleatorio

      function generaDestino(used) {
        let rdmKey;
        let created = false;
        do {
          let rdm = Math.floor(Math.random() * filteredWpKeys.length);
          rdmKey = filteredWpKeys[rdm];
          if (used.includes(rdmKey)) {
            created = false;
          }
          else {
            created = true;
          }
        } while (!created);

        const wp = waypoints[rdmKey];
        return { 'name': rdmKey, 'x': wp.x, 'y': wp.y };
      };
      function esPuntoValido(x, y) {
        for (let punto of prevCoords) {
          let dx = x - punto.x;
          let dy = y - punto.y;
          if (Math.sqrt(dx * dx + dy * dy) <= 250) {
            return false;
          }
        }
        return true;
      }

      // Parametros de vuelo por default
      const pos = { 'x': 0, 'y': 0 };
      const dir = { 'name': '', 'angle': 0 };
      const alt = 0;
      const current = { 'pos': pos, 'dir': dir, 'alt': alt, 'spd': 0 };
      const target = { 'pos': pos, 'dir': dir, 'alt': alt, 'spd': 0 };
      const params = { 'current': current, 'target': target }

      for (let i = 0; i < cant; i++) {
        let rdm = Math.floor(Math.random() * airLines.length);
        let flight = JSON.parse(JSON.stringify(airLines[rdm]));
        let tempCallsign = flight.callsign + generarRdmId();
        // Se asegura de que no existan callsings activos repetidos
        while (this.activesCallsigns.includes(tempCallsign)) {
          tempCallsign = flight.callsign + generarRdmId();
        }
        this.activesCallsigns.push(tempCallsign)
        flight.callsign = tempCallsign;
        flight.params = JSON.parse(JSON.stringify(params));
        flight.active = false;
        flight.inWarning = false;
        flight.approachTo = '';
        flight.inApproach = false;
        let tipo = generarTipo();

        if (tipo == '1Departure') {
          const used = this.createUsedDepartureWP();
          let tar = generaDestino(used);
          flight['type'] = "dep";
          flight.params.current.pos.x = this.depPoint.x;
          flight.params.current.pos.y = this.depPoint.y;
          flight.params.current.dir.angle = this.depAngle;
          flight.params.current.dir.name = '';

          flight.params.target.pos.x = -1;
          flight.params.target.pos.y = -1;
          flight.params.target.dir.name = '';
          flight.params.target.dir.angle = this.depAngle;
          flight.params.target.spd = (Math.floor(Math.random() * 17) + 20) * 10;
          flight.params.target.alt = (Math.floor(Math.random() * 15) + 4) * 1000;

          flight.endPoint = { 'name': tar.name, 'x': tar.x, 'y': tar.y };
          tar = null;
        }
        if (tipo == '2Arrival') {
          let alt = (Math.floor(Math.random() * 9) + 10) * 1000;
          let spd = (Math.floor(Math.random() * 7) + 25) * 10;
          let cur = generaOrigen();
          let valid = esPuntoValido(cur.x, cur.y)
          while (!valid) {
            cur = generaOrigen();
            valid = esPuntoValido(cur.x, cur.y)
          }
          prevCoords.push({ 'x': cur.x, 'y': cur.y });
          let destx = Math.floor(Math.random() * 400) + 600;
          let desty = Math.floor(Math.random() * 400) + 600;
          let angle = this.conv2PuntosA_HDH(cur.x, cur.y, destx, desty);
          flight['type'] = "arr";
          flight.params.current.pos.x = cur.x;
          flight.params.current.pos.y = cur.y;
          flight.params.current.alt = alt
          flight.params.current.spd = spd
          flight.params.current.dir.angle = angle;

          flight.params.target.alt = alt
          flight.params.target.spd = spd
          flight.params.target.pos.x = -1;
          flight.params.target.pos.y = -1;
          flight.params.target.dir.angle = angle;
          flight.active = true;
          flight.endPoint = { 'name': 'Airport', 'x': 800, 'y': 800 };
          cur = null;
        }
        flight.trailpoints = [];
        for (let i = 1; i <= 20; i++) {
          flight.trailpoints.push([flight.params.current.pos.x, flight.params.current.pos.y]);
        }

        if (Object.keys(this.flights['1Departure']).length < 12) {
          this.flights[tipo][flight.callsign] = flight;
          created = true;
        }
        flight = null;

      }
      this.iniCoords = [];
      return created;
    },

    // Crea angulo y punto de despegue para nuevos Departures
    crearAnguloDespegue: function () {
      this.depAngle = Math.random() < 0.5 ? this.rwAngle1 : this.rwAngle2;
      // Establecer el punto de despegue al inicio de la pista
      this.depPoint = this.calcEndPos(800, 800, this.depAngle - 180, 30);
    },

    // Crea un nuevo punto en el rastro de vuelo
    crearTrailPoint: function (type, callsign, x, y) {
      const flight = this.flights[type][callsign];
      const [curX, curY] = flight.trailpoints[0];
      if (this.calcDist(curX, curY, x, y) > 20) {
        flight.trailpoints.unshift([parseFloat(x.toFixed(1)), parseFloat(y.toFixed(1))]);
        flight.trailpoints.pop();
      }
    },

    //TODO SECCION DE FUNCIONES CONVERTIDORAS Y CALCULADORAS

    // Convierte 2 puntos a heading del punto 1 al punto 2
    conv2PuntosA_HDH: function (x1, y1, x2, y2) {
      const anguloRadianes = Math.atan2(y1 - y2, x2 - x1);
      // Convertir directamente radianes a grados y luego a grados náuticos en una línea
      return this.convGrados(this.convRad2Deg(anguloRadianes));
    },

    // Convierte shortname y flyId a instruccion de radio
    convFlyIdToRadio: function (flyId, shortName) {
      return `${shortName} ${flyId.slice(3).split('').join(' ')}`
    },

    // Convierte Grados en Radianes
    convDeg2Rad: function (deg) {
      return deg * Math.PI / 180;
    },

    // Convierte Radianes en Grados
    convRad2Deg: function (rad) {
      return (rad * 180) / Math.PI;
    },

    // Convierte un ángulo en grados desde el sistema cartesiano a náutico, y viceversa.
    convGrados: function (input) {
      let output = (450 - input) % 360;
      if (output < 0) {
        output += 360; // Ajusta en caso de un resultado negativo para asegurar un rango positivo.
      }
      return output;
    },

    // Calcula la distancia entre dos puntos
    calcDist: function (x1, y1, x2, y2) {
      return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    // Calcula una posicion final, dando posición inicial, angulo y distancia.
    calcEndPos: function (x1, y1, angle, dist) {
      if (angle > 360) { angle -= 360; }
      const rads = this.convDeg2Rad(angle);
      const Dx = Math.sin(rads) * dist;
      const Dy = Math.cos(rads) * dist;
      const Px = x1 + Dx;
      const Py = y1 - Dy;
      return { 'x': Px, 'y': Py };
    },

    // Calcula la direccion de giro (le/ri), dando angulo actual y angulo objetivo
    calcTurn: function (curAngle, tarAngle) {
      let diferencia = (tarAngle - curAngle + 360) % 360;
      return diferencia > 180 ? 'le' : 'ri';
    },

    // Calcula parámetros de aproximación
    calcApprParams: function (flight) {
      // Obtiene parámetros actuales
      const rwToApp = flight.approachTo;
      const curX = flight.params.current.pos.x;
      const curY = flight.params.current.pos.y;
      const ang2App = rwToApp == this.rwNames.bot ? this.rwAngle1 : this.rwAngle2;
      const endRwPos = this.calcEndPos(800, 800, ang2App + 180, 30);

      // Calcula distancia al extremo de la pista
      const dist2rw = this.calcDist(curX, curY, endRwPos.x, endRwPos.y);
      if (dist2rw > 100) {
        // 97% de distancia al extremo de la pista
        const dist2rwTar = dist2rw * 0.97
        // Punto a girar
        const tarPos = this.calcEndPos(800, 800, ang2App + 180, dist2rwTar);
        // Angulo al punto
        const ang2align = this.conv2PuntosA_HDH(curX, curY, tarPos.x, tarPos.y);
        flight.params.target.dir.angle = ang2align;
      } else {
        flight.params.target.dir.angle = ang2App;
        flight.params.current.dir.angle = ang2App;
        flight.params.target.spd = 170;
      }

      // Velocidad
      const curAlt = flight.params.current.alt;
      flight.params.target.spd = curAlt < 10 ? 30 : flight.params.target.spd;

      // Altura de aproximación
      const tarAlt = dist2rw * 17.6;
      if (curAlt > tarAlt) {
        flight.params.current.alt -= 36;
        flight.params.target.alt = Math.round(tarAlt);
      }
      if (curAlt <= 55 && curAlt > 0) {
        flight.params.current.alt = 0;
        flight.params.target.alt = 0;
      }
      return flight;
    },

    // Calcula ajustes de posición y TrailPoints
    calcNewPosition: function (flight) {
      // Constante de desplazamiento, 500 para velocidad normal, a mayor número menos desplazamiento.
      const k = 500;
      // Calcula deltas de posicion
      const curRad = this.convDeg2Rad(this.convGrados(flight.params.current.dir.angle));
      const Dx = parseFloat((Math.cos(curRad) * flight.params.current.spd / k).toFixed(2));
      const Dy = parseFloat((Math.sin(curRad) * flight.params.current.spd / k).toFixed(2));
      // Calcula nueva Posicion
      const newPx = flight.params.current.pos.x + Dx
      const newPy = flight.params.current.pos.y - Dy
      // Inserta TrailPoint
      const type = this.convType(flight.type)
      this.crearTrailPoint(type, flight.callsign, newPx, newPy);
      // Asigna posición
      flight.params.current.pos.x = newPx;
      flight.params.current.pos.y = newPy;
      return flight;
    },

    // Calcula ajuste de velocidad
    calcNewVel: function (flight) {
      const curAlt = flight.params.current.alt;
      if (flight.params.target.spd > flight.params.current.spd) {
        if (flight.params.current.spd < 250) {
          flight.params.current.spd += 1;
        } else {
          if (curAlt >= 10000) {
            flight.params.current.spd += 1;
          }
        }
      }
      if (flight.params.target.spd < flight.params.current.spd) {
        flight.params.current.spd -= 1;
      }
      return flight;
    },

    // Calcula ajuste de altitud
    calcNewAlt: function (flight) {
      const curAlt = flight.params.current.alt;
      const diff = flight.params.target.alt - curAlt;
      if (diff > 18) {
        if (flight.params.current.spd >= 160) { flight.params.current.alt += 18; }
      } else if ((diff <= 18 && diff > 0) || (diff >= -18 && diff < 0)) {
        flight.params.current.alt = flight.params.target.alt
      } else if (diff < -18) {
        if (curAlt > 10000) {
          flight.params.current.alt -= 18;
        } else {
          if (flight.params.current.spd > 250) {
            if (flight.params.target.spd > 250) {
              flight.params.target.spd = 250;
            }
          } else {
            flight.params.current.alt -= 18;
          }
        }
      }
      return flight;
    },

    // Calcula nuevo Heading
    calcNewHdg: function (flight) {

      //Actualiza pseudoVOR en caso de que se esté siguiendo un vuelo
      if (flight.params.target.dir.name != '') {
        const vorTarget = flight.params.target.dir.name;
        // obtiene tipo de VOR
        const VOR = this.mixedWayPoints[vorTarget];

        if (VOR) {
          // Si es VOR variable
          if (VOR.type == 'var') {
            flight.params.target.pos.x = VOR.x;
            flight.params.target.pos.y = VOR.y;
          }
        } else {
          // Si ya no existe el VOR (vuelo terminado)
          flight.params.target.pos.x = 0;
          flight.params.target.pos.y = 0;
          flight.params.target.dir.name = '';
        }
      }

      // Ajusta el Hdh hacia un VOR si no está en aproximación y tiene coordenedas objetivo establecidas.
      if (!flight.inApproach && flight.params.target.pos.x > 0) {
        flight.params.target.dir.angle = this.conv2PuntosA_HDH(
          flight.params.current.pos.x,
          flight.params.current.pos.y,
          flight.params.target.pos.x,
          flight.params.target.pos.y,
        );
      }

      // Ajusta hdg
      const curAlt = flight.params.current.alt;
      let curAng = flight.params.current.dir.angle;
      const diffAng = Math.abs(curAng - flight.params.target.dir.angle);
      if (diffAng >= 0.5) {
        let turn = this.calcTurn(curAng, flight.params.target.dir.angle);
        if (curAlt >= 2500) {
          switch (turn) {
            case 'le':
              curAng -= 0.5;
              break;
            case 'ri':
              curAng += 0.5;
              break;
          }
        }
        if (curAng >= 361) {
          curAng -= 360;
        }
        if (curAng < 1) {
          curAng += 360;
        }
        flight.params.current.dir.angle = curAng
      }

      return flight;
    },

    // Calcula si está dentro de la señal ILS para un Approach
    calcApproachable: function (flight) {
      const curX = flight.params.current.pos.x;
      const curY = flight.params.current.pos.y;
      let approachable = false;
      const curAlt = flight.params.current.alt;
      if (curAlt <= 3500) {
        const CURDIST = this.calcDist(curX, curY, 800, 800);
        const TARDIST = this.ilsDist + 30;
        if (CURDIST < TARDIST && CURDIST > 200) {
          const degDif = this.ilsDegDif;
          const rwAngleMin = this.rwAngle2 - degDif;
          const rwAngleMax = this.rwAngle2 + degDif;
          const rwAngle2Min = rwAngleMin + 180;
          const rwAngle2Max = rwAngleMax + 180;
          const ang2rw = this.conv2PuntosA_HDH(curX, curY, 800, 800);
          if (ang2rw + 180 > rwAngleMin && ang2rw + 180 < rwAngleMax) {
            flight.approachTo = this.rwNames.bot;
            approachable = true;
          } else if (ang2rw + 180 > rwAngle2Min && ang2rw + 180 < rwAngle2Max) {
            flight.approachTo = this.rwNames.top;
            approachable = true
          }
        }
      }
      if (!approachable) {
        flight.approachTo = '';
      }
      return flight;
    },

    //TODO SECCION DE FUNCIONES SET y UNSET

    // Establece el vuelo activo (seleccionado desde el mapa o desde la lista de vuelos)
    setActiveFlight: function (obj) {
      this.selectedFly = obj.id;
      this.selectedType = obj.type;
      const target = this.flights[obj.type][obj.id].params.target;
      // Actualiza selectedParams basado en el target
      this.selectedParams = {
        ...this.selectedParams, // Conserva propiedades existentes
        wayP: target.dir.name,
        hdg: target.dir.name === "" ? Math.floor(target.dir.angle) : "",
        spd: target.spd,
        alt: target.alt,
        takeoff: false
      };
    },

    // Limpia el texto en Heading
    unsetHdgText: function () {
      this.selectedParams.hdg = '';
    },

    // Limpia el texto en Direct to WayPoint
    unsetWpText: function () {
      this.selectedParams.wayP = '';
    },

    // Establece los parámatros de vuelo indicados en el formulario
    setCommandToFly: function () {
      // Solamente se ejecuta cuando hay vuelo seleccionado
      if (this.selectedFly != "") {
        // Inicialización de la orden como arreglo para facilitar la agregación
        const orders = [];
        const type = this.selectedType;
        const flyId = this.selectedFly;
        const flightParams = this.flights[type][flyId].params;
        const { target: tar, current: cur } = flightParams;

        //Obtiene velocidad y altura
        let spd = parseInt(this.selectedParams.spd, 10);
        let alt = parseInt(this.selectedParams.alt, 10);
        if (alt && alt < 3000) alt *= 100; // Conversión de Flight Level a pies si es necesario



        // Velocidad: validación y asignación
        if (alt < 10000) spd = Math.min(250, spd);
        if (spd && spd !== tar.spd) {

          let spdLimit = Math.max(160, Math.min(480, spd)); // Límites entre 160 y 480
          orders.push(`${spdLimit > cur.spd ? "increase speed to" : "reduce speed to"} ${spdLimit} knots`);
          this.selectedParams.spd = tar.spd = spdLimit;
        }

        // Altitud: validación y asignación
        if (alt && alt !== tar.alt) {
          const altLimit = Math.max(3000, Math.min(20000, alt)); // Límites entre 3000 y 20000 pies
          orders.push(`${altLimit > cur.alt ? "climb to" : "descend to"} ${altLimit} feet and maintain`);
          this.selectedParams.alt = tar.alt = altLimit;
        }

        // Dirección (HDG) y WayPoint
        let hdg = parseInt(this.selectedParams.hdg, 10);
        if (this.selectedParams.wayP.toUpperCase() === "") {
          if (hdg == 0) { hdg = 360; }
          if (hdg && hdg !== tar.dir.angle) {
            hdg = Math.max(1, Math.min(360, hdg)); // Asegura que hdg esté entre 1 y 360
            orders.push(`turn ${this.calcTurn(cur.dir.angle, hdg) === 'ri' ? "right" : "left"} to ${String(hdg).padStart(3, '0').split('').join(' ')}`);
            tar.dir = { angle: hdg, name: "" };
            tar.pos = { x: -1, y: -1 };
          }
        } else if (this.selectedParams.wayP.toUpperCase() !== tar.dir.name) {
          const wayP = this.selectedParams.wayP.toUpperCase();
          const VOR = this.mixedWayPoints[wayP];
          if (VOR) {
            tar.pos = { x: VOR.x, y: VOR.y };
            tar.dir.name = wayP;
            orders.push(`direct to ` + this.convAlfa(wayP));
          } else {
            this.showMessage("VOR does not exist");
          }
        }

        // Despegue
        if (this.selectedParams.takeoff) {
          this.flights[type][flyId].active = true;
          orders.unshift("Cleared for takeoff");
        }

        // Construye y envía la orden final si hay instrucciones
        if (orders.length > 0) {
          const { shortName } = this.flights[type][flyId];
          const callId = this.convFlyIdToRadio(flyId, shortName);
          const orderStr = `${callId} ${orders.join(", ")}.`;
          this.addToSpeak(orderStr);
          this.showMessage("Sending instructions...");
        }

        // Actualiza el vuelo activo para reflejar los cambios
        this.setActiveFlight({ id: flyId, type: type });
      }
    },

    // Establece un vuelo en espera como activo
    setToTakeoff: function (flyId) {
      this.flights["1Departure"][flyId].active = true;
      this.addToSpeak(`${flyId} Cleared for takeoff`);
    },

    // Establece vuelo a procedimiento de aproximación
    setToApproach: function (flyId) {
      // Acceso directo al vuelo seleccionado para reducir la repetición
      const flight = this.flights["2Arrival"][flyId];

      // Configura el vuelo para la aproximación
      flight.inApproach = true;
      flight.params.target.pos = { x: 800, y: 800 }; // Establece posición de aproximación
      flight.params.target.dir.name = ''; // Limpia el nombre de la dirección
      flight.params.target.spd = 200; // Reduce velocidad

      // Mensaje de voz y visualización para la aproximación
      const callId = this.convFlyIdToRadio(this.selectedFly, flight.shortName);
      this.addToSpeak(`${callId} reduce speed to 200 knots and follow I L S signal to ${flight.approachTo}`);
      this.showMessage(`${this.selectedFly} approaching to: ${flight.approachTo}`);
    },

    setAbortApproach: function (flyId) {
      // Acceso directo al vuelo seleccionado para reducir la repetición
      const flight = this.flights["2Arrival"][flyId];
      // Cancela la aproximación
      flight.inApproach = false;
      flight.params.target.pos = { x: -1, y: -1 }; // Libera posicion objetivo
      flight.params.target.dir.name = ''; // Limpia el nombre de la dirección
      flight.params.target.spd = 250; // Restaura velocidad
      flight.params.target.alt = 3000; // Restaura altitud
      flight.params.target.dir.angle = flight.params.current.dir.angle;

      this.selectedParams.hdg = Math.floor(flight.params.current.dir.angle);
      this.selectedParams.wayP = '';
      this.selectedParams.spd = 250;
      this.selectedParams.alt = 3000;

      // Mensaje de voz y visualización de la cancelación
      const callId = this.convFlyIdToRadio(this.selectedFly, flight.shortName);
      this.addToSpeak(`${callId} Abort approach! increase speed to 200 knots and increase altitud to 3000 feet.`);
      this.showMessage(`${this.selectedFly} approaching canceled!`);

    },

    // Quita un vuelo del juego
    removeFlight: function (type, callsign) {
      if (this.selectedFly == callsign) {
        this.selectedFly = '';
      }
      let index = this.activesCallsigns.indexOf(callsign);
      if (index !== -1) {
        this.activesCallsigns.splice(index, 1);
      }
      this.flights[type][callsign] = null;
      delete this.flights[type][callsign];
    },

    //TODO SECCION DE FUNCIONES PARA AUDIOS DE RADIO 

    // Añade a cola de instrucciones
    addToSpeak: function (msg) {
      this.speak.queue.push(msg); // Añade el mensaje actual a la cola
      if (!this.speak.speaking) {
        // Si no está hablando, comienza a decir.
        this.nextSpeak();
      }
    },

    // Transmite la siguiente instrucción (si la hay)
    nextSpeak: function () {
      if (this.speak.queue.length === 0 || this.speak.speaking) return;
      const nextText = this.speak.queue.shift();
      this.speaking(nextText);
    },

    // Ejecuta la transmisión de radio
    speaking: function (text) {
      if (!text) return; // Si el texto está vacío, no hace nada
      let utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.onend = () => {
        this.speak.speaking = false; // Indica que la síntesis ha finalizado
        utterance = null;
        if (this.speak.queue.length > 0) {
          this.nextSpeak();
        }
      };
      window.speechSynthesis.speak(utterance);
      this.speak.speaking = true; // Indica que se ha iniciado una síntesis de voz
    },

    // Convierte una cadena a letras de alfabeto aeronautico
    convAlfa: function (cadena) {
      const alfabetoAeronautico = {
        'A': 'Alfa', 'B': 'Bravo', 'C': 'Charlie', 'D': 'Delta', 'E': 'Echo',
        'F': 'Foxtrot', 'G': 'Golf', 'H': 'Hotel', 'I': 'India', 'J': 'Juliett',
        'K': 'Kilo', 'L': 'Lima', 'M': 'Mike', 'N': 'November', 'O': 'Oscar',
        'P': 'Papa', 'Q': 'Quebec', 'R': 'Romeo', 'S': 'Sierra', 'T': 'Tango',
        'U': 'Uniform', 'V': 'Victor', 'W': 'Whiskey', 'X': 'X-ray', 'Y': 'Yankee',
        'Z': 'Zulu',
        '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four',
        '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine'
      };
      let resultado = '';
      for (let i = 0; i < cadena.length; i++) {
        let letra = cadena[i].toUpperCase();
        if (alfabetoAeronautico.hasOwnProperty(letra)) {
          resultado += alfabetoAeronautico[letra] + ' ';
        } else {
          resultado += ' ';
        }
      }
      resultado = resultado.trim();
      return resultado;
    },

    // Convierte tipo de vuelo abreviado a tipo completo
    convType: function (type) {
      const typeMap = { dep: "1Departure", arr: "2Arrival" };
      return typeMap[type];
    },

    // TODO SECCION DE FUNCIONES VERIFICADORAS

    hasExitedMap: function (flight) {
      let hasExit = false;
      //Obtiene coordenadas
      const curX = flight.params.current.pos.x;
      const curY = flight.params.current.pos.y;
      if (curX < 20 || curX > 1580 || curY < this.Ymin || curY > this.Ymax) {
        const msg = "Flight " + flight.callsign + " lost out the map.";
        this.showMessage(msg);
        this.addToSpeak(msg);
        const type = this.convType(flight.type)
        this.removeFlight(type, flight.callsign);
        this.score.points -= 1000;
        hasExit = true;
      }
      return hasExit;
    },

    hasReachedDestination: function (flight) {
      let hasReach = false;
      const endP = flight.endPoint;
      const curX = flight.params.current.pos.x;
      const curY = flight.params.current.pos.y;
      const curAlt = flight.params.current.alt;
      if (flight.type == 'arr' && curAlt > 30) {
        return false
      }
      if (this.calcDist(curX, curY, endP.x, endP.y) < 10) {
        const msg = "Flight " + flight.callsign + " has been completed"
        this.showMessage(msg);
        this.addToSpeak(msg);
        const type = this.convType(flight.type)
        this.removeFlight(type, flight.callsign);
        if (flight.type == 'dep') {
          this.score.points += 50;
          this.completedFly.dep++;
        } else {
          this.score.points += 100;
          this.completedFly.arr++;
        }
        hasReach = true;
      }
      return hasReach;
    },

    //TODO FUNCIONES DE CONTROL DEL JUEGO

    recalcular: async function () {
      let activePos = [];
      let inWarning = [];
      let inTakeoff = this.inProcedures("1Departure");
      let inApproach = this.inProcedures("2Arrival");
      for (let type in this.flights) {
        for (let flightId in this.flights[type]) {
          let flight = this.flights[type][flightId];
          if (flight.active) {
            // EN APROXIMACION AUTOMATICA
            if (flight.inApproach) {
              //Calcula parámetros de aproximación
              flight = this.calcApprParams(flight);
            }

            // Verifica si el vuelo a salido del mapa
            const hasExitedMap = this.hasExitedMap(flight);

            // Verifica si el vuelo a llegado a su destino
            const hasReachedDestination = this.hasReachedDestination(flight);

            // En cualquiera de los dos casos, salta al siguiente vuelo
            if (hasExitedMap || hasReachedDestination) {
              continue;
            }

            // Actualiza posición
            flight = this.calcNewPosition(flight);

            // Actualiza velocidad
            flight = this.calcNewVel(flight);

            // Actualiza altitud
            flight = this.calcNewAlt(flight);


            // Actualiza dirección (Heading)
            flight = this.calcNewHdg(flight);

            //Obtiene coordenadas para revisar proximidad
            const curX = flight.params.current.pos.x;
            const curY = flight.params.current.pos.y;
            const curAlt = flight.params.current.alt;

            // Revisa proximidad con otros vuelos activos
            for (actFly of activePos) {
              // [callsign, x, y, alt]
              x2 = actFly[1];
              y2 = actFly[2];
              alt2 = actFly[3];
              if (Math.abs(curAlt - alt2) < 1000 && (this.calcDist(curX, curY, x2, y2) * 1600 / this.winW) < (60 * 1600 / this.winW)) {
                inWarning.push(actFly[0]);
                inWarning.push(flightId);
                this.score.points -= 1;
              }
            }
            activePos.push([flightId, curX, curY, curAlt]);

            // Verifica si está dentro de un ILS
            if (type == "2Arrival" && !flight.inApproach) {
              flight = this.calcApproachable(flight);
            }

            //Actualiza vuelo

            this.flights[type][flightId] = flight;
          }
          if (!flight.active) {
            if (!inApproach && !inTakeoff) {
              this.setToTakeoff(flightId);
              inTakeoff = true;
            }
          }
        }
      }
      this.inWarning = [...new Set(inWarning)];
    },

    inProcedures: function (type) {
      var inProcedure = false
      for (let flightId in this.flights[type]) {
        let flight = this.flights[type][flightId];
        if (type == "1Departure") {
          if (flight.active && flight.params.current.alt < 1000) {
            inProcedure = true;
          }
        }
        if (type == "2Arrival") {
          if (flight.params.current.spd < 200) {
            inProcedure = true;
          }
        }
      }
      return inProcedure;
    },

    // Juego ejecutándose
    runGame: function () {
      this.playInterval = setInterval(() => {
        this.recalcqtty++;
        // Crea un nuevo vuelo cada 90 segundos (270 ciclos)
        if (this.recalcqtty % 270 == 269) {

          let created = this.crearVuelo(1);
          if (created) {
            this.addToSpeak("New flight on the game.");
          } else {
            this.addToSpeak("Please attend Departures.");
            this.showMessage("ATTEND DEPARTURES!");
          }

          //actualiza record
          const record = parseInt(localStorage.getItem("record"));
          if (this.score.points > record) {
            this.score.record = this.score.points;
            localStorage.setItem("record", this.score.record);
          }
        }
        this.recalcular();
      }, this.refreshRate);
    },

    // Cambia entre Paused / Playing
    tooglePlay: function () {
      if (this.playInterval === null) {
        this.runGame();
      } else {
        clearInterval(this.playInterval);
        this.playInterval = null;
      }
    },

    //Muestra archivo de ayuda
    showHelp: function () {
      if (this.playInterval !== null) {
        this.tooglePlay();
      }
      window.open('help.html', '_blank');
    },

  },

  computed: {
    mixedWayPoints: function () {
      let mixed = {};
      // Agregar waypoints fijos
      Object.entries(this.waypoints).forEach(([fixedId, fixed]) => {
        mixed[fixedId] = { ...fixed, type: 'fix' };
      });

      // Agregar vuelos de llegada
      Object.entries(this.flights['2Arrival']).forEach(([arrId, arrFli]) => {
        const { x, y } = arrFli.params.current.pos;
        mixed[arrId] = { type: 'var', x: Math.round(x), y: Math.round(y) };
      });

      return mixed;
    },

  },

  beforeDestroy() {
    if (this.playInterval !== null) {
      clearInterval(this.playInterval);
    }
  },
})

const airLines = [{
  name: "KLM",
  shortName: "Kilo Lima Metro",
  callsign: "KLM",
}, {
  name: "Delta Airlines",
  callsign: "DLT",
  shortName: "Delta",
}, {
  name: "JetBlue",
  callsign: "JBU",
  shortName: "JetBlue",
}, {
  name: "United Airlines",
  callsign: "UAL",
  shortName: "United",
}, {
  name: "Southwest Airlines",
  callsign: "SWA",
  shortName: "Southwest",
}, {
  name: "American Airlines",
  callsign: "AAL",
  shortName: "American",
}, {
  name: "British Airways",
  callsign: "BAW",
  shortName: "Speedbird",
}, {
  name: "Continental Airlines",
  callsign: "COA",
  shortName: "Continental",
}, {
  name: "Lufthansa",
  callsign: "DLH",
  shortName: "Lufthansa",
}, {
  name: "Air France",
  callsign: "AFR",
  shortName: "Air France",
}, {
  name: "China Southern Airlines",
  callsign: "CSN",
  shortName: "China Southern",
}, {
  name: "China Eastern Airlines",
  callsign: "CES",
  shortName: "China Eastern",
}, {
  name: "All Nippon Airways",
  callsign: "ANA",
  shortName: "All Nippon",
}, {
  name: "Ryanair",
  callsign: "RYR",
  shortName: "Ryanair",
}, {
  name: "Turkish Airlines",
  callsign: "THY",
  shortName: "Turkish",
}, {
  name: "Emirates",
  callsign: "UAE",
  shortName: "Emirates",
}, {
  name: "FedEx Express",
  callsign: "FDX",
  shortName: "Fedex",
}, {
  name: "UPS Airlines",
  callsign: "UPS",
  shortName: "Uniform Papa Sierra",
}, {
  name: "Cathay Pacific",
  callsign: "CPA",
  shortName: "Cathay",
}, {
  name: "Qatar Airways",
  callsign: "QTR",
  shortName: "Qatari",
}, {
  name: "Korean Air",
  callsign: "KAL",
  shortName: "Korean Air",
}, {
  name: "Cargolux",
  callsign: "CLX",
  shortName: "Cargolux",
}, {
  name: "Air China",
  callsign: "CCA",
  shortName: "Air China",
}, {
  name: "Egyptair",
  callsign: "MSR",
  shortName: "Egyptair",
}, {
  name: "Cathay Dragon",
  callsign: "HDA",
  shortName: "Dragon",
}, {
  name: "Norwegian Air Shuttle",
  callsign: "NAX",
  shortName: "Norwegian",
}, {
  name: "Finnair",
  callsign: "FIN",
  shortName: "Finnair",
}, {
  name: "Iberia",
  callsign: "IBE",
  shortName: "Iberia",
}, {
  name: "South African Airways",
  callsign: "SAA",
  shortName: "Springbok",
}, {
  name: "Scandinavian Airlines",
  callsign: "SAS",
  shortName: "Scandinavian",
}, {
  name: "Virgin Atlantic",
  callsign: "VIR",
  shortName: "Virgin",
}, {
  name: "DHL",
  callsign: "DHL",
  shortName: "Delta Hotel Lima",
}, {
  name: "HOP",
  callsign: "HOP",
  shortName: "Air Hop",
}, {
  name: "Air Canada",
  callsign: "ACA",
  shortName: "Air Canada",
}, {
  name: "Spirit Wings",
  callsign: "NKS",
  shortName: "Spirit",
}]

