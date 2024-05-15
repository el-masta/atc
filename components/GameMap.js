atc.component('game-map', {
  props: ['angle', 'rwnames', 'waypoints', 'flights', 'selectedfly', 'warning','ils', 'score', 'completed'],
  emits: ['setactive'],
  template: /*html*/
    `
    <div id="map" class="w-full h-full bg-black">
      <svg
      id="map-svg"
      :viewBox="viewBoxText"
      xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Limites de SVG -->
        <rect id="svgMap" width="1600" height="1600" fill="none" stroke="none"></rect>
        <!-- Marco -->
        <rect id="boundaries"
          width="1560"
          :height="Math.round( (mapSize.height / mapSize.scale)  - 40 )"
          fill="none" stroke="#666" stroke-dasharray="20, 20"
          :transform="'translate(20 ' + Math.round( (mapSize.yOffset / mapSize.scale) + 20) +')'">
        </rect>
        <!-- Puntaje -->
        <text class="mapTag" x="25" :y="Math.round( (mapSize.yOffset / mapSize.scale) + 35)" >Points: {{Math.round(score.points, 0)}} Record: {{Math.round(score.record, 0)}}</text>
        <!-- Completed -->
        <text class="mapTag" x="200" :y="Math.round( (mapSize.yOffset / mapSize.scale) + 35)" >Completed: {{completed.dep}} departures,   {{completed.arr}} arrivals</text>

        <!-- Aeropuerto -->
        <g id="airport" :transform="'rotate('+ angle +' 800 800)'">
          <!-- Pista -->
          <rect x="798" y="770" width="4" height="60" fill="white"/>
          <!-- Linea ILS -->
          <line class="ils-line" stroke-dasharray="20,30" x1="800" y1="400" x2="800" y2="1200"></line>
          <!-- WayPoints -->
          <text class="mapTag" x="802" y="765" :transform="'rotate('+ (-angle) +' 802 765)'">{{rwnames.top}}</text>
          <text class="mapTag" x="802" y="850" :transform="'rotate('+ (-angle) +' 802 850)'">{{rwnames.bot}}</text>
          <!-- Areas ILS -->
          <g>
            <path v-for="dText in ils" :d="dText" stroke="none" fill="rgba(128,255,128,0.03)"></path>
          </g>
        </g>
        <!-- Círculos -->
        <g id="circles">
          <circle r="200" cx="800" cy="800" fill="none"></circle>
          <circle r="400" cx="800" cy="800" fill="none"></circle>
          <circle r="600" cx="800" cy="800" fill="none"></circle>
          <circle r="800" cx="800" cy="800" fill="none"></circle>
          <circle r="1000" cx="800" cy="800" fill="none"></circle>
        </g>
        <!-- VORs -->
        <g>
          <g v-for="(wp, wpIndex) in waypoints" :transform="'translate(' + wp.x + ' ' + wp.y + ')'">
            <circle r="2" fill="white"/>
            <text class="mapTag" x="3" y="8">{{wpIndex}}</text>
          </g>
        </g>
        <!-- Flights -->
        <g v-for="(type, typeId) in flights">
          <g v-for="(flight, flightId) in type">
            <!-- Linea de vuelo -->
            <g v-if="flight.callsign==selectedfly">
              <line class="fly-line" v-if="flight.params.target.dir.name==''" stroke-dasharray="5,5" :x1="flight.params.current.pos.x.toFixed(1)" :y1="flight.params.current.pos.y.toFixed(1)" :x2="flight.params.current.pos.x.toFixed(1)" :y2="(flight.params.current.pos.y-2000).toFixed(1)"  :transform="'rotate('+ flight.params.target.dir.angle +' '+flight.params.current.pos.x.toFixed(1)+' '+flight.params.current.pos.y.toFixed(1)+') translate(' + 0 + ' ' + 0 + ')'" ></line>
              <line class="fly-line" v-if="flight.params.target.dir.name!=''" stroke-dasharray="5,5" :x1="flight.params.current.pos.x.toFixed(1)" :y1="flight.params.current.pos.y.toFixed(1)" :x2="flight.params.target.pos.x.toFixed(1)" :y2="flight.params.target.pos.y.toFixed(1)"></line>
              <!-- Cruz del vuelo -->
              <!-- Vertical -->
              <line stroke-dasharray="30,30" stroke="#444" stroke-width="1" :x1="flight.params.current.pos.x.toFixed(1)" y1="0" :x2="flight.params.current.pos.x.toFixed(1)" y2="1600"></line>
              <!-- Horizontal -->
              <line stroke-dasharray="30,30" stroke="#444" stroke-width="1" x1="0" :y1="flight.params.current.pos.y.toFixed(1)" x2="1600" :y2="flight.params.current.pos.y.toFixed(1)"></line>
            </g>
            <!-- Señal del vuelo -->
            <g v-if="flight.active" @click="$emit('setactive', {'id':flightId,'type':typeId})">
              <circle r="2" :cx="flight.params.current.pos.x.toFixed(1)" :cy="flight.params.current.pos.y.toFixed(1)" fill="red"></circle>
              <circle :r="30*mapSize.scale" :cx="flight.params.current.pos.x.toFixed(1)" :cy="flight.params.current.pos.y.toFixed(1)" fill="none" :class="[flight.type == 'arr' ? 'arrDistC' : 'depDistC', flight.callsign == selectedfly ? 'fillFlyActive' : 'fillFlyInactive', warning.includes(flight.callsign) ? 'fillWarning':'' ]"></circle>
              <text :class="[flight.callsign == selectedfly ? 'SVGselectedText' : 'mapTag']" :x="(flight.params.current.pos.x + 5).toFixed(1)" :y="(flight.params.current.pos.y-5).toFixed(1)">{{flight.callsign}}</text>
              <text :class="[flight.callsign == selectedfly ? 'SVGselectedText' : 'mapTag']" :x="(flight.params.current.pos.x + 5).toFixed(1)" :y="(flight.params.current.pos.y+5).toFixed(1)">{{flight.params.current.alt}} ft</text>
              <text :class="[flight.callsign == selectedfly ? 'SVGselectedText' : 'mapTag']" :x="(flight.params.current.pos.x + 5).toFixed(1)" :y="(flight.params.current.pos.y+15).toFixed(1)">{{flight.params.current.spd}} kts</text>
              <!-- Trail -->
              <path fill="none" :class="[flight.type == 'arr' ? 'arrTrail' : 'depTrail']" stroke-dasharray="8,3" :d="dStr(flight.trailpoints)"></path>
            </g>
            
          </g>
        </g>
      </svg>
    </div>
  `,

  data() {
    return {
      mapSize: {
        width: 1600,
        height: 1600,
        ratio: 1,
        yOffset: 0,
        scale: 1,
        yMin: 0,
        yMax: 0,
      },
      viewBoxText: "0 0 1600 1600"
    };
  },
  mounted() {
    // Actualizar el tamaño de la pantalla cuando el componente se monta
    this.updateScreenSize();
    // Escuchar el evento resize para actualizar el tamaño de la pantalla cuando cambie
    window.addEventListener('resize', this.updateScreenSize);
  },
  methods: {
    // Actualizar el tamaño de la pantalla
    updateScreenSize: function () {
      // Obtiene tamaño de pantalla en pixeles
      const w = window.innerWidth - 273;
      const h = window.innerHeight;
      // Calcula escala y proporción
      const scale = w / 1600
      const prop = h / w;
      // Calcula altura del SVG en unidades del mapa
      const svgH = 1600 * prop;
      // Calcula offset en unidades del mapa
      const offset = Math.floor((1600 - svgH) / 2);

      this.mapSize.width = w;
      this.mapSize.height = h;
      this.mapSize.yMin = offset + 20;
      this.mapSize.yMax = Math.round(offset + svgH - 20);
      this.mapSize.scale = scale;
      this.mapSize.yOffset = offset * scale;
      this.mapSize.ratio = prop;
      this.viewBoxText = "0 " + offset + " 1600 " + Math.floor(svgH);
    },
    // Arma la cadena D para trailponts
    dStr: function (trailpoints) {
      return trailpoints.reduce((acc, [x, y], index) => {
        // Usa 'M' para el primer punto para mover, luego 'L' para los siguientes puntos
        const command = index === 0 ? 'M' : 'L';
        return `${acc} ${command}${x},${y}`;
      }, '');
    },
  },
  beforeUnmount() {
    // Eliminar el event listener cuando el componente se desmonta para evitar fugas de memoria
    window.removeEventListener('resize', this.updateScreenSize);
  },

});