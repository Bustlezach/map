'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const resetButton = document.querySelector('.reset');

class Workout {
  date = new Date();
  id = String(Date.now()).slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = `running`;
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this._calcPace();
    this._setDescription();
  }

  _calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = `cycling`;
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this._calcSpeed();
    this._setDescription();
  }

  _calcSpeed() {
    //km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}



//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  // Private class field
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    // GET USER POSITION
    this._getPosition();

    // GET DATA FROM LOCAL STORAGE
    this._getLocalStorage();

    // ATTACH EVENT HANDLER
    // Submit form
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField.bind(this));

    containerWorkouts.addEventListener('click', this._moveTopup.bind(this));

    resetButton.addEventListener('click', this._reset.bind(this));

  }


  _getPosition() {
    //Getting the GEOLOCATION
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Couldn't get your position`);
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords; // destructuring latitude
    const { longitude } = position.coords; // destructuring longitude

    const coords = [latitude, longitude];
  

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(this.#map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // to capture the event on the map by using the map function and handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMaker(work);
    });

  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Clear inpit fields on the form
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        ` `;
    form.getElementsByClassName.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.getElementsByClassName.display = 'grid, 1000'));
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _moveTopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    // using the public interface
    // workout.click();
  }

  _newWorkout(e) {
    // the validation mechanism
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    // to filter zero and negative number
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();
    // console.log(this);

    // GEt data from the form
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // check if the data is valid

    //if the workout is running, then create running object
    if (type === 'running') {
      const cadence = Number(inputCadence.value);
      if (
      
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert`Input have to be positive.`;

      workout = new Running([lat, lng], distance, duration, cadence);

      // add the new object to the workout array
      this.#workouts.push(workout);
    }

    //if the workout is cycling, then create cycling object
    if (type === 'cycling') {
      const elevation = Number(inputElevation.value);
      if (
      
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);

      // add the new object to the workout array
      this.#workouts.push(workout);
    }

    // console.log(workout);

    // Hide form and hide the input fields
    this._hideForm();

    // Render workout on map as a marker
    this._renderWorkoutMaker(workout);

    // Render the new workout on the list
    this._renderWorkout(workout);

    // Set local storage to all workout
    this._setLocalStorage();
  }


  _renderWorkoutMaker(workout) {
    //DISPLAY MAKER
    // console.log(this.#mapEvent);

    // This is the code that adds the maker to the map
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
  <li class="workout workout--${workout.type}" data-id=${workout.id}>
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">24</span>
      <span class="workout__unit">min</span>
    </div>
    `;

    if (workout.type === 'running')
      html += `
    <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}<span>
         <span class="workout__unit">spm</span>
     </div>
   </li>
    `;

    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li> -->

    `;

    form.insertAdjacentHTML('afterend', html);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;

    // rendering each object of #workout on the map
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _reset(){
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
