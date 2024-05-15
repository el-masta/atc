atc.component('traffic-wrap', {
  props: {
    flights: {
      type: Object,
      required: true,
    },
    selectedfly: String, // Validación de tipo para props
  },
  emits: ['setactive', 'takeoff', 'settoapproach'],
  template: /*html*/
    `
    <div id="traffic-wrapper" class="bg-gray">
      <template v-for="(type, typeId) in flights" :key="typeId">
        <div v-for="(flight, flightId) in type" :key="typeId + '_' + flightId" class="flightCard"
          :class="getFlightCardClasses(flight)" @click="$emit('setactive', {id: flightId, type: typeId})">
          <div class="cardEl2">
            <div class="cardEl bold">{{ flight.callsign }}</div>
            <div class="cardEl"> to: {{ flight.endPoint.name }}</div>
          </div>
          <div class="cardEl2">{{ flight.params.current.spd }}kts
            <span class="f-red" v-if="flight.params.current.spd !== flight.params.target.spd">-{{ flight.params.target.spd }}kts</span>
          </div>
          <div class="takeoff manita" title="Ready for Takeoff" v-if="flight.type === 'dep' && !flight.active" @click="$emit('takeoff', flightId)"></div>
          <div class="takeoffing" title="In Takeoff procedure" v-if="flight.type === 'dep' && flight.active && flight.params.current.alt < 1000"></div>
          <div class="approach manita" title="Readsy to Approach" v-if="flight.approachTo !== '' && !flight.inApproach"  @click="$emit('settoapproach', flightId)"></div>
          <div class="landing" title="In Landing procedure" v-if="flight.inApproach"></div>
          <div class="cardEl2">{{ Math.floor(flight.params.current.dir.angle) }}&deg;
            <span class="f-red fz-10" v-if="Math.abs(flight.params.current.dir.angle - flight.params.target.dir.angle) > 1">-{{ Math.floor(flight.params.target.dir.angle) }}&deg;</span>
            <span v-if="flight.params.target.dir.name !== ''">&nbsp;{{ flight.params.target.dir.name }}</span>
          </div>
          <div class="cardEl2">{{ toFormat(flight.params.current.alt) }}ft
            <span class="f-red" v-if="flight.params.current.alt !== flight.params.target.alt">-{{ toFormat(flight.params.target.alt) }}ft</span>
          </div>
        </div>
      </template>
    </div>
  `,
  methods: {
    toFormat(numero) {
      return numero.toLocaleString('en-US');
    },
    getFlightCardClasses(flight) {
      // Simplificando el binding de clases con un objeto
      return {
        arrCard: flight.type === 'arr',
        depCard: flight.type !== 'arr',
        flActive: flight.active,
        flInactive: !flight.active,
        selectedFly: flight.callsign === this.selectedfly,
      };
    },
  },
});
