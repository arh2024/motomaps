// =========================================================
// MOTO MAPS
// ОСНОВНА ЛОГІКА
// =========================================================


// =========================================================
// SUPABASE
// =========================================================

const SUPABASE_URL =
  'https://mthbckypfurmebncdukj.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_gfNOlLBzqvK-Sm9PfOzlWA_bDHq-MME';

let supabaseClient = null;

if (window.supabase) {

  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

  console.log('Supabase підключено');

}


// =========================================================
// КАРТА
// =========================================================

const map =
  L.map('map').setView(
    [47.8388, 35.1396],
    12
  );


// Використовуємо OSM і для світлої,
// і для темної теми.
// Темна тема робиться CSS-фільтром.
// Це прибирає залежність від CARTO API.

const mapLayer =
  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution:
        '&copy; OpenStreetMap contributors'
    }
  );


mapLayer.addTo(map);


// =========================================================
// ЗМІННІ
// =========================================================

let myMarker = null;

let meetingMarker = null;

let meetingLocation = null;

let rideMarkers = [];

let currentScreen = 'map';

let profileReturnScreen = 'map';

let choosingLocation = false;

let currentRidersRideId = null;


// =========================================================
// THEME
// =========================================================

function getSavedTheme() {

  return localStorage.getItem('motoTheme') === 'light'
    ? 'light'
    : 'dark';
}


function applyTheme(theme) {

  const safeTheme =
    theme === 'light'
      ? 'light'
      : 'dark';

  document.documentElement.dataset.theme =
    safeTheme;

  localStorage.setItem(
    'motoTheme',
    safeTheme
  );

  const toggle =
    document.getElementById('themeToggle');

  if (toggle) {

    toggle.checked =
      safeTheme === 'light';

  }

}


function toggleTheme() {

  const nextTheme =
    getSavedTheme() === 'dark'
      ? 'light'
      : 'dark';

  applyTheme(nextTheme);

  const label =
    document.getElementById('themeLabel');

  if (label) {

    label.textContent =
      nextTheme === 'light'
        ? 'Світла'
        : 'Темна';

  }

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}


// =========================================================
// GPS
// =========================================================

function findMe() {

  if (!navigator.geolocation) {

    alert(
      'Ваш браузер не підтримує геолокацію.'
    );

    return;

  }


  navigator.geolocation.getCurrentPosition(

    function(position) {

      const lat =
        position.coords.latitude;

      const lng =
        position.coords.longitude;


      map.setView(
        [lat, lng],
        15
      );


      if (myMarker) {

        myMarker.setLatLng(
          [lat, lng]
        );

      } else {

        const icon =
          L.divIcon({

            className:
              'my-location-marker',

            html:
              '<div class="my-location-dot"></div>',

            iconSize:
              [32, 32],

            iconAnchor:
              [16, 16]

          });


        myMarker =
          L.marker(
            [lat, lng],
            {
              icon
            }
          )
          .addTo(map)
          .bindPopup(
            '🏍️ Ви тут'
          );

      }

      myMarker.openPopup();

    },

    function(error) {

      console.error(
        'Геолокація:',
        error
      );

      alert(
        'Дозвольте доступ до геолокації у браузері.'
      );

    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }

  );

}


// =========================================================
// NAVIGATION
// =========================================================

function hideMapInterface() {

  const ids = [

    'mapHeader',
    'mapSearchBox',
    'mapFilters',
    'weatherButton',
    'mapControls',
    'mapAddButton',
    'bottomNav'

  ];


  ids.forEach(function(id) {

    const element =
      document.getElementById(id);

    if (element) {

      element.style.display =
        'none';

    }

  });

}


function showMapInterface() {

  const elements = {

    mapHeader:
      'block',

    mapSearchBox:
      'flex',

    mapFilters:
      'flex',

    weatherButton:
      'flex',

    mapControls:
      'flex',

    mapAddButton:
      'flex',

    bottomNav:
      'grid'

  };


  Object.keys(elements)
    .forEach(function(id) {

      const element =
        document.getElementById(id);

      if (element) {

        element.style.display =
          elements[id];

      }

    });

}


function hideAllScreens() {

  [
    'rides',
    'chat',
    'profile',
    'settings'
  ]
  .forEach(function(id) {

    const element =
      document.getElementById(id);

    if (element) {

      element.style.display =
        'none';

    }

  });

}


function setActiveNav(name) {

  document
    .querySelectorAll('.nav-item')
    .forEach(function(item) {

      item.classList.remove(
        'active'
      );

    });


  const target =
    document.getElementById(
      name === 'map'
        ? 'navMap'
        : 'navRides'
    );


  if (target) {

    target.classList.add(
      'active'
    );

  }

}


function showCloseButton() {

  const button =
    document.getElementById(
      'backButton'
    );

  if (button) {

    button.style.display =
      'flex';

    button.style.alignItems =
      'center';

    button.style.justifyContent =
      'center';

  }

}


function hideCloseButton() {

  const button =
    document.getElementById(
      'backButton'
    );

  if (button) {

    button.style.display =
      'none';

  }

}


function showMap() {

  currentScreen = 'map';

  hideAllScreens();

  hideCloseButton();

  showMapInterface();

  setActiveNav('map');

  setTimeout(function() {

    map.invalidateSize();

  }, 100);

}

function showSuccessMessage(message) {

  const messageBox =
    document.createElement('div');

  messageBox.className =
    'success-message';

  messageBox.textContent =
    message;

  document.body.appendChild(
    messageBox
  );

  setTimeout(() => {

    messageBox.remove();

  }, 2500);

}

function showRides() {

  currentScreen = 'rides';

  hideMapInterface();

  hideCloseButton();

  hideAllScreens();

  setActiveNav('rides');
  localStorage.setItem('unreadRides', '0');
  updateNotificationsBadge();

  const rides =
    document.getElementById(
      'rides'
    );


  rides.style.display =
    'block';


  renderRides();

}


function goBack() {

  if (currentScreen === 'settings') {

    showProfile();

    return;

  }


  if (currentScreen === 'profile') {

    showMap();

    return;

  }


  showMap();

}


// =========================================================
// MAP FILTERS
// =========================================================

function showMapFilters() {

  const filters =
    document.getElementById(
      'mapFilters'
    );


  if (!filters) return;


  if (
    filters.style.display ===
    'none'
  ) {

    filters.style.display =
      'flex';

  } else {

    filters.style.display =
      'none';

  }

}


function toggleMapFilter(button) {

  button.classList.toggle(
    'active'
  );

}


// =========================================================
// MODAL — CREATE RIDE
// =========================================================

function openModal() {

  const modal =
    document.getElementById(
      'modal'
    );


  if (!modal) return;


  modal.style.display =
    'flex';


  const date =
    document.getElementById(
      'rideDate'
    );


  const time =
    document.getElementById(
      'rideTime'
    );


  if (date && !date.value) {

    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      )
      .padStart(2, '0');

    const day =
      String(
        now.getDate()
      )
      .padStart(2, '0');


    date.min =
      `${year}-${month}-${day}`;

  }


  if (time && !time.value) {

    time.value =
      '20:00';

  }

}


function closeModal() {

  const modal =
    document.getElementById(
      'modal'
    );


  if (modal) {

    modal.style.display =
      'none';

  }

}


// =========================================================
// MEETING LOCATION
// =========================================================

function setMeetingLocation(
  lat,
  lng,
  label
) {

  meetingLocation = {

    lat:
      Number(lat),

    lng:
      Number(lng),

    label:
      label || 'Точка збору'

  };


  if (meetingMarker) {

    meetingMarker.setLatLng(
      [lat, lng]
    );

  } else {

    const icon =
      L.divIcon({

        className:
          '',

        html:
          '<div class="meeting-marker">🏍️</div>',

        iconSize:
          [38, 38],

        iconAnchor:
          [19, 19]

      });


    meetingMarker =
      L.marker(
        [lat, lng],
        {
          icon,
          draggable: true
        }
      )
      .addTo(map);


    meetingMarker.on(
      'dragend',
      function(event) {

        const position =
          event.target.getLatLng();

        meetingLocation.lat =
          position.lat;

        meetingLocation.lng =
          position.lng;

        meetingLocation.label =
          'Точка на карті';

        updateLocationStatus();

      }
    );

  }


  meetingMarker.bindPopup(
    '📍 ' +
    escapeHtml(
      meetingLocation.label
    )
  );


  updateLocationStatus();

}


function updateLocationStatus() {

  const element =
    document.getElementById(
      'locationStatus'
    );


  if (!element) return;


  if (!meetingLocation) {

    element.textContent =
      '📍 Точку збору ще не вибрано';

    return;

  }


  element.textContent =
    '📍 ' +
    meetingLocation.label;

}


function chooseLocation() {

  closeModal();

  choosingLocation = true;

  showMap();

  alert(
    'Натисніть на карті місце збору.'
  );

}


// Клік по карті

map.on(
  'click',
  function(event) {

    if (!choosingLocation) {
      return;
    }


    const lat =
      event.latlng.lat;

    const lng =
      event.latlng.lng;


    setMeetingLocation(
      lat,
      lng,
      'Точка на карті'
    );


    choosingLocation =
      false;


    openModal();

  }
);


// =========================================================
// SEARCH ADDRESS
// =========================================================

async function searchMeetingAddress() {

  const input =
    document.getElementById(
      'rideAddress'
    );


  const results =
    document.getElementById(
      'addressResults'
    );


  if (!input || !results) {
    return;
  }


  const query =
    input.value.trim();


  if (!query) {

    alert(
      'Введіть адресу або місце.'
    );

    return;

  }


  results.innerHTML =
    '<div class="address-result">🔎 Пошук...</div>';

  results.style.display =
    'block';


  try {

    const url =
      'https://nominatim.openstreetmap.org/search?' +
      new URLSearchParams({

        q:
          query,

        format:
          'json',

        addressdetails:
          '1',

        limit:
          '5',

        'accept-language':
          'uk'

      });


    const response =
      await fetch(url, {

        headers: {

          'Accept':
            'application/json'

        }

      });


    if (!response.ok) {

      throw new Error(
        'Помилка пошуку'
      );

    }


    const data =
      await response.json();


    if (!data.length) {

      results.innerHTML =
        '<div class="address-result">Нічого не знайдено.</div>';

      return;

    }


    results.innerHTML =
      '';


    data.forEach(function(place) {

      const button =
        document.createElement(
          'button'
        );


      button.type =
        'button';

      button.className =
        'address-result';

      button.textContent =
        place.display_name;


      button.onclick =
        function() {

          selectAddressResult(
            place
          );

        };


      results.appendChild(
        button
      );

    });

  } catch (error) {

    console.error(
      error
    );


    results.innerHTML =
      '<div class="address-result">Не вдалося виконати пошук.</div>';

  }

}


function selectAddressResult(
  place
) {

  const lat =
    Number(place.lat);

  const lng =
    Number(place.lon);

  const label =
    place.display_name;


  setMeetingLocation(
    lat,
    lng,
    label
  );


  map.setView(
    [lat, lng],
    16
  );


  meetingMarker.openPopup();


  const input =
    document.getElementById(
      'rideAddress'
    );


  const results =
    document.getElementById(
      'addressResults'
    );


  if (input) {

    input.value =
      label;

  }


  if (results) {

    results.style.display =
      'none';

  }

}


// =========================================================
// SAVE RIDE
// =========================================================

function getRides() {

  try {

    return JSON.parse(
      localStorage.getItem(
        'motoRides'
      )
    ) || [];

  } catch (error) {

    return [];

  }

}

function getUnreadRides() {

  return Number(
    localStorage.getItem(
      'unreadRides'
    )
  ) || 0;

}


function increaseUnreadRides() {

  const count =
    getUnreadRides() + 1;

  localStorage.setItem(
    'unreadRides',
    count
  );

}


function updateNotificationsBadge() {

  const badge =
    document.getElementById(
      'notificationsBadge'
    );

  if (!badge) return;

  const count =
    getUnreadRides();

  badge.textContent =
    count;

  badge.hidden =
    count === 0;

}

function saveRides(rides) {

  localStorage.setItem(
    'motoRides',
    JSON.stringify(rides)
  );

}


function saveRide() {

  const name =
    document.getElementById(
      'rideName'
    ).value.trim();


  const date =
    document.getElementById(
      'rideDate'
    ).value;


  const time =
    document.getElementById(
      'rideTime'
    ).value;


  const people =
    document.getElementById(
      'ridePeople'
    ).value;


  if (!name) {

    alert(
      'Вкажіть назву мотопоїздки.'
    );

    return;

  }


  if (!date) {

    alert(
      'Оберіть дату.'
    );

    return;

  }


  if (!time) {

    alert(
      'Оберіть час.'
    );

    return;

  }


  if (!meetingLocation) {

    alert(
      'Оберіть точку збору.'
    );

    return;

  }


  const rides =
    getRides();


  const profile =
    getProfile();


  const ride = {

    id:
      Date.now(),

    name,

    date,

    time,

    people:
      Number(people) || 1,

    location:
      meetingLocation.label,

    lat:
      meetingLocation.lat,

    lng:
      meetingLocation.lng,

    creator:
      profile.nickname ||
      'Moto Rider',

    riders: [

      {

        name:
          profile.nickname ||
          'Moto Rider',

        bike:
          profile.bike ||
          'Мотоцикл не вказано'

      }

    ]

  };


rides.unshift(
  ride
);

saveRides(
  rides
);
increaseUnreadRides();
updateNotificationsBadge();
closeModal();

renderRideMarkers();

showMap();

showSuccessMessage(
  '🏍️ Мотопоїздку створено!'
);

}


// =========================================================
// RIDE MARKERS
// =========================================================

function clearRideMarkers() {

  rideMarkers.forEach(
    function(marker) {

      map.removeLayer(
        marker
      );

    }
  );


  rideMarkers =
    [];

}


function renderRideMarkers() {

  clearRideMarkers();


  const rides =
    getRides();


  rides.forEach(function(ride) {

    if (
      typeof ride.lat !== 'number' ||
      typeof ride.lng !== 'number'
    ) {

      return;

    }


    const marker =
      L.marker(
        [ride.lat, ride.lng]
      )
      .addTo(map)
      .bindPopup(
        `<strong>🏍️ ${escapeHtml(ride.name)}</strong><br>` +
        `📅 ${escapeHtml(formatDate(ride.date))}<br>` +
        `🕐 ${escapeHtml(ride.time)}<br>` +
        `📍 ${escapeHtml(ride.location)}`
      );


    rideMarkers.push(
      marker
    );

  });

}


// =========================================================
// RENDER RIDES
// =========================================================

function renderRides() {

  const container =
    document.getElementById(
      'rides'
    );


  if (!container) return;


  const rides =
    getRides();


  let html = `

    <div class="screen-card">

      <div class="screen-title-row">

        <div>

          <span class="screen-eyebrow">
            MOTO MAPS
          </span>

          <h2>
            🏍️ Мотопоїздки
          </h2>

        </div>

      <button
        class="rides-add-button"
        type="button"
        onclick="showMap()"
         aria-label="Закрити"
                    >
         ×
      </button>

      </div>

      <div class="rides-toolbar">

        <div class="ride-counter">
          ${rides.length}
          ${rides.length === 1 ? 'поїздка' : 'поїздок'}
        </div>

      </div>
  `;


  if (!rides.length) {

    html += `

      <div class="empty-state">

        <div class="empty-state-icon">
          🏍️
        </div>

        <h3>
          Поки немає мотопоїздок
        </h3>

        <p>
          Створи першу поїздку та збери свою компанію.
        </p>

        <button
          class="create-btn"
          type="button"
          onclick="openModal()"
        >
          + Створити мотопоїздку
        </button>

      </div>

    `;

  } else {

    rides.forEach(function(ride) {

      const ridersCount =
        Array.isArray(ride.riders)
          ? ride.riders.length
          : 1;


      html += `

        <article class="ride-card">

          <h3>
            🏍️ ${escapeHtml(ride.name)}
          </h3>

          <div class="ride-meta">

            <div>
              📅 ${escapeHtml(formatDate(ride.date))}
            </div>

            <div>
              🕐 ${escapeHtml(ride.time)}
            </div>

            <div>
              👥 до ${escapeHtml(ride.people)}
            </div>

            <div>
              🏍️ ${ridersCount} учасн.
            </div>

          </div>

          <div class="ride-location">

            📍 ${escapeHtml(ride.location)}

          </div>

          <div class="ride-actions">

            <button
              class="ride-action"
              type="button"
              onclick="showRideRiders(${ride.id})"
            >
              👥 Мотоциклісти
            </button>

            <button
              class="ride-action"
              type="button"
              onclick="openRideOnMap(${ride.id})"
            >
              📍 На карті
            </button>

          </div>

        </article>

      `;

    });

  }


  html += `
      </div>
  `;


  container.innerHTML =
    html;

}


// =========================================================
// RIDE HELPERS
// =========================================================

function formatDate(date) {

  if (!date) return '—';


  const parts =
    date.split('-');


  if (parts.length !== 3) {

    return date;

  }


  return (
    parts[2] +
    '.' +
    parts[1] +
    '.' +
    parts[0]
  );

}


function openRideOnMap(id) {

  const ride =
    getRides().find(
      function(item) {

        return Number(item.id) ===
          Number(id);

      }
    );


  if (!ride) return;


  if (
    typeof ride.lat !== 'number' ||
    typeof ride.lng !== 'number'
  ) {

    alert(
      'Для цієї поїздки координати ще не задані.'
    );

    return;

  }


  showMap();


  map.setView(
    [ride.lat, ride.lng],
    16
  );


  const marker =
    rideMarkers.find(
      function(item) {

        const position =
          item.getLatLng();

        return (
          Math.abs(position.lat - ride.lat) < 0.000001 &&
          Math.abs(position.lng - ride.lng) < 0.000001
        );

      }
    );


  if (marker) {

    marker.openPopup();

  }

}


// =========================================================
// RIDERS
// =========================================================

function showRideRiders(id) {

  const ride =
    getRides().find(
      function(item) {

        return Number(item.id) ===
          Number(id);

      }
    );


  if (!ride) return;


  currentRidersRideId =
    id;


  const modal =
    document.getElementById(
      'ridersModal'
    );


  const list =
    document.getElementById(
      'ridersList'
    );


  const subtitle =
    document.getElementById(
      'ridersModalSubtitle'
    );


  if (!modal || !list) return;


  subtitle.textContent =
    ride.name;


  const riders =
    Array.isArray(ride.riders)
      ? ride.riders
      : [];


  if (!riders.length) {

    list.innerHTML = `
      <div class="empty-state">
        👥 Учасників поки немає.
      </div>
    `;

  } else {

    list.innerHTML =
      riders
        .map(function(rider) {

          return `

            <div class="profile-info-row">

              <span>
                🏍️
              </span>

              <strong>
                ${escapeHtml(rider.name)}
                <br>
                <small>
                  ${escapeHtml(rider.bike)}
                </small>
              </strong>

            </div>

          `;

        })
        .join('');

  }


  modal.style.display =
    'flex';

}


function closeRidersModal() {

  const modal =
    document.getElementById(
      'ridersModal'
    );


  if (modal) {

    modal.style.display =
      'none';

  }

}


// =========================================================
// PROFILE
// =========================================================

function getProfile() {

  const defaultProfile = {

    nickname:
      'Moto Rider',

    bike:
      'Поки не вказано',

    city:
      'Поки не вказано',

    about:
      'Не заповнено',

    avatar:
      ''

  };


  const saved =
    localStorage.getItem(
      'motoProfile'
    );


  if (!saved) {

    return defaultProfile;

  }


  try {

    return {

      ...defaultProfile,

      ...JSON.parse(saved)

    };

  } catch (error) {

    return defaultProfile;

  }

}


function saveProfile(profile) {

  localStorage.setItem(
    'motoProfile',
    JSON.stringify(profile)
  );


  updateHeaderAvatar();

}


function updateHeaderAvatar() {

  const button =
    document.getElementById(
      'headerAvatar'
    );


  if (!button) return;


  const profile =
    getProfile();


  if (profile.avatar) {

    button.innerHTML =
      `<img src="${profile.avatar}" alt="Аватар">`;

  } else {

    button.textContent =
      '🏍️';

  }

}


function showProfile() {

  if (!supabaseClient) {

    openAuthModal();

    return;

  }


  supabaseClient.auth
    .getSession()
    .then(function(result) {

      const session =
        result.data.session;


      if (!session) {

        openAuthModal();

        return;

      }


      profileReturnScreen =
        currentScreen === 'settings'
          ? 'profile'
          : 'map';


      currentScreen =
        'profile';


      hideAllScreens();

      hideMapInterface();

      showCloseButton();


      const profile =
        document.getElementById(
          'profile'
        );


      if (!profile) return;


      profile.style.display =
        'block';


      renderProfile();

    });

}


function renderProfile() {

  const element =
    document.getElementById(
      'profile'
    );


  if (!element) return;


  const profile =
    getProfile();


  element.innerHTML = `

    <div class="screen-card profile-screen-card">

      <div class="screen-title-row">

        <div>

          <span class="screen-eyebrow">
            MOTO MAPS
          </span>

          <h2>
            👤 Мій профіль
          </h2>

        </div>

      </div>


      <div class="profile-avatar-large">

        ${
          profile.avatar
            ? `<img src="${profile.avatar}" alt="Аватар">`
            : '🏍️'
        }

      </div>


      <label class="avatar-upload">

        📷 Змінити аватар

        <input
          id="avatarInput"
          type="file"
          accept="image/*"
          onchange="handleAvatarUpload(event)"
        >

      </label>


      <div class="profile-info">

        <div class="profile-info-row">

          <span>
            Нікнейм
          </span>

          <strong>
            ${escapeHtml(profile.nickname)}
          </strong>

        </div>


        <div class="profile-info-row">

          <span>
            Мотоцикл
          </span>

          <strong>
            ${escapeHtml(profile.bike)}
          </strong>

        </div>


        <div class="profile-info-row">

          <span>
            Місто
          </span>

          <strong>
            ${escapeHtml(profile.city)}
          </strong>

        </div>


        <div class="profile-info-row">

          <span>
            Про себе
          </span>

          <strong>
            ${escapeHtml(profile.about)}
          </strong>

        </div>

      </div>


      <div class="profile-buttons">

        <button
          class="secondary-btn"
          type="button"
          onclick="editProfile()"
        >
          ✏️ Редагувати профіль
        </button>


        <button
          class="secondary-btn"
          type="button"
          onclick="showSettings()"
        >
          ⚙️ Налаштування
        </button>


        <button
          class="cancel-btn"
          type="button"
          onclick="logoutUser()"
        >
          Вийти з акаунта
        </button>

      </div>

    </div>

  `;

}


function handleAvatarUpload(event) {

  const file =
    event.target.files[0];


  if (!file) return;


  if (!file.type.startsWith('image/')) {

    alert(
      'Оберіть зображення.'
    );

    return;

  }


  if (file.size > 5 * 1024 * 1024) {

    alert(
      'Фото має бути не більше 5 МБ.'
    );

    return;

  }


  const reader =
    new FileReader();


  reader.onload =
    function(e) {

      const image =
        new Image();


      image.onload =
        function() {

          const canvas =
            document.createElement(
              'canvas'
            );


          const maxSize =
            512;


          let width =
            image.width;

          let height =
            image.height;


          if (width > height) {

            if (width > maxSize) {

              height =
                height *
                maxSize /
                width;

              width =
                maxSize;

            }

          } else {

            if (height > maxSize) {

              width =
                width *
                maxSize /
                height;

              height =
                maxSize;

            }

          }


          canvas.width =
            width;

          canvas.height =
            height;


          const ctx =
            canvas.getContext(
              '2d'
            );


          ctx.drawImage(
            image,
            0,
            0,
            width,
            height
          );


          const avatar =
            canvas.toDataURL(
              'image/jpeg',
              .82
            );


          const profile =
            getProfile();


          profile.avatar =
            avatar;


          saveProfile(
            profile
          );


          renderProfile();

        };


      image.src =
        e.target.result;

    };


  reader.readAsDataURL(
    file
  );

}


// =========================================================
// EDIT PROFILE
// =========================================================

function editProfile() {

  const profile =
    getProfile();


  const nickname =
    prompt(
      'Нікнейм:',
      profile.nickname
    );


  if (nickname === null) {
    return;
  }


  const bike =
    prompt(
      'Мотоцикл:',
      profile.bike
    );


  if (bike === null) {
    return;
  }


  const city =
    prompt(
      'Місто:',
      profile.city
    );


  if (city === null) {
    return;
  }


  const about =
    prompt(
      'Про себе:',
      profile.about
    );


  if (about === null) {
    return;
  }


  profile.nickname =
    nickname.trim() ||
    'Moto Rider';

  profile.bike =
    bike.trim() ||
    'Поки не вказано';

  profile.city =
    city.trim() ||
    'Поки не вказано';

  profile.about =
    about.trim() ||
    'Не заповнено';


  saveProfile(
    profile
  );


  renderProfile();

}


// =========================================================
// SETTINGS
// =========================================================

function showSettings() {

  currentScreen =
    'settings';


  hideAllScreens();

  hideMapInterface();

  showCloseButton();


  const settings =
    document.getElementById(
      'settings'
    );


  if (!settings) return;


  settings.style.display =
    'block';


  const theme =
    getSavedTheme();


  settings.innerHTML = `

    <div class="screen-card">

      <div class="screen-title-row">

        <div>

          <span class="screen-eyebrow">
            MOTO MAPS
          </span>

          <h2>
            ⚙️ Налаштування
          </h2>

        </div>

      </div>


      <div class="settings-row">

        <div class="settings-info">

          <strong>
            Тема
          </strong>

          <span id="themeLabel">
            ${theme === 'light' ? 'Світла' : 'Темна'}
          </span>

        </div>


        <label class="theme-switch">

          <input
            id="themeToggle"
            type="checkbox"
            ${theme === 'light' ? 'checked' : ''}
            onchange="toggleTheme()"
          >

          <span class="theme-slider"></span>

        </label>

      </div>


      <button
        class="secondary-btn"
        type="button"
        onclick="showProfile()"
      >
        ← Профіль
      </button>

    </div>

  `;

}


// =========================================================
// AUTH
// =========================================================

let authMode =
  'login';


function openAuthModal() {

  const modal =
    document.getElementById(
      'authModal'
    );


  if (modal) {

    modal.style.display =
      'flex';

  }


  showLoginForm();

}


function closeAuthModal() {

  const modal =
    document.getElementById(
      'authModal'
    );


  if (modal) {

    modal.style.display =
      'none';

  }

}


function showLoginForm() {

  authMode =
    'login';


  document
    .getElementById(
      'authLoginTab'
    )
    .classList.add('active');


  document
    .getElementById(
      'authRegisterTab'
    )
    .classList.remove('active');


  document
    .getElementById(
      'authPhoneGroup'
    )
    .style.display =
    'none';


  document
    .getElementById(
      'authPasswordConfirmGroup'
    )
    .style.display =
    'none';


  document
    .getElementById(
      'authSubmitButton'
    )
    .textContent =
    'Увійти';


  document
    .getElementById(
      'authModalTitle'
    )
    .textContent =
    'Вхід у Moto Maps';


  document
    .getElementById(
      'authModalDescription'
    )
    .textContent =
    'Увійди до свого облікового запису.';


  clearAuthMessage();

}


function showRegisterForm() {

  authMode =
    'register';


  document
    .getElementById(
      'authRegisterTab'
    )
    .classList.add('active');


  document
    .getElementById(
      'authLoginTab'
    )
    .classList.remove('active');


  document
    .getElementById(
      'authPhoneGroup'
    )
    .style.display =
    'block';


  document
    .getElementById(
      'authPasswordConfirmGroup'
    )
    .style.display =
    'block';


  document
    .getElementById(
      'authSubmitButton'
    )
    .textContent =
    'Створити акаунт';


  document
    .getElementById(
      'authModalTitle'
    )
    .textContent =
    'Реєстрація';


  document
    .getElementById(
      'authModalDescription'
    )
    .textContent =
    'Створи свій акаунт Moto Maps.';


  clearAuthMessage();

}


function setAuthMessage(
  message,
  type = 'error'
) {

  const element =
    document.getElementById(
      'authMessage'
    );


  if (!element) return;


  element.textContent =
    message;


  element.style.color =
    type === 'success'
      ? 'var(--turquoise)'
      : 'var(--danger)';

}


function clearAuthMessage() {

  const element =
    document.getElementById(
      'authMessage'
    );


  if (element) {

    element.textContent =
      '';

  }

}


// =========================================================
// PHONE FORMAT
// =========================================================

function formatUkrainePhone(
  value
) {

  let digits =
    String(value)
      .replace(/\D/g, '');


  if (digits.startsWith('380')) {

    digits =
      digits.substring(3);

  }


  if (digits.startsWith('38')) {

    digits =
      digits.substring(2);

  }


  digits =
    digits.substring(0, 10);


  let result =
    '+38';


  if (digits.length > 0) {

    result +=
      ' ' +
      digits.substring(0, 3);

  }


  if (digits.length > 3) {

    result +=
      ' ' +
      digits.substring(3, 6);

  }


  if (digits.length > 6) {

    result +=
      ' ' +
      digits.substring(6, 8);

  }


  if (digits.length > 8) {

    result +=
      ' ' +
      digits.substring(8, 10);

  }


  return result;

}


function formatUkrainePhoneInput(
  input
) {

  input.value =
    formatUkrainePhone(
      input.value
    );

}


// =========================================================
// LOGIN / REGISTER
// =========================================================

async function loginUser() {

  if (!supabaseClient) {

    setAuthMessage(
      'Supabase недоступний.'
    );

    return;

  }


  const email =
    document.getElementById(
      'authEmail'
    ).value.trim();


  const password =
    document.getElementById(
      'authPassword'
    ).value;


  if (!email) {

    setAuthMessage(
      'Введіть email.'
    );

    return;

  }


  if (!password) {

    setAuthMessage(
      'Введіть пароль.'
    );

    return;

  }


  try {

    if (authMode === 'login') {

      const result =
        await supabaseClient.auth.signInWithPassword({

          email,

          password

        });


      if (result.error) {

        throw result.error;

      }


      setAuthMessage(
        'Вхід виконано.',
        'success'
      );


      setTimeout(
        function() {

          closeAuthModal();

          showMap();

        },
        400
      );


      return;

    }


    const phone =
      document.getElementById(
        'authPhone'
      ).value.trim();


    const confirmPassword =
      document.getElementById(
        'authPasswordConfirm'
      ).value;


    if (password.length < 6) {

      setAuthMessage(
        'Пароль має містити щонайменше 6 символів.'
      );

      return;

    }


    if (password !== confirmPassword) {

      setAuthMessage(
        'Паролі не збігаються.'
      );

      return;

    }


    const result =
      await supabaseClient.auth.signUp({

        email,

        password,

        options: {

          data: {

            phone

          }

        }

      });


    if (result.error) {

      throw result.error;

    }


    setAuthMessage(
      'Акаунт створено. Перевірте email.',
      'success'
    );


  } catch (error) {

    console.error(
      error
    );


    setAuthMessage(
      error.message ||
      'Помилка авторизації.'
    );

  }

}


async function loginWithGoogle() {

  if (!supabaseClient) {

    setAuthMessage(
      'Supabase недоступний.'
    );

    return;

  }


  try {

    const result =
      await supabaseClient.auth.signInWithOAuth({

        provider:
          'google',

        options: {

          redirectTo:
            window.location.origin

        }

      });


    if (result.error) {

      throw result.error;

    }

  } catch (error) {

    console.error(
      error
    );


    setAuthMessage(
      error.message ||
      'Не вдалося увійти через Google.'
    );

  }

}


async function logoutUser() {

  if (supabaseClient) {

    await supabaseClient.auth.signOut();

  }


  showMap();

}


// =========================================================
// WEATHER
// =========================================================

function openWeather() {

  const modal =
    document.getElementById(
      'weatherModal'
    );


  if (!modal) return;


  modal.style.display =
    'flex';


  loadWeather();

}


function closeWeather() {

  const modal =
    document.getElementById(
      'weatherModal'
    );


  if (modal) {

    modal.style.display =
      'none';

  }

}


async function loadWeather() {

  let lat =
    47.8388;

  let lon =
    35.1396;


  if (
    meetingLocation &&
    typeof meetingLocation.lat === 'number'
  ) {

    lat =
      meetingLocation.lat;

    lon =
      meetingLocation.lng;

  }


  try {

    const url =
      'https://api.open-meteo.com/v1/forecast?' +
      new URLSearchParams({

        latitude:
          lat,

        longitude:
          lon,

        current:
          'temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,weather_code',

        daily:
          'weather_code,temperature_2m_max,temperature_2m_min',

        timezone:
          'auto',

        forecast_days:
          '4'

      });


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        'Weather request failed'
      );

    }


    const data =
      await response.json();


    renderWeather(
      data
    );

  } catch (error) {

    console.error(
      'Weather:',
      error
    );

    document.getElementById(
      'weatherCurrentDescription'
    ).textContent =
      'Не вдалося завантажити погоду.';

  }

}


function weatherIcon(
  code
) {

  if (code === 0) return '☀️';

  if (
    code === 1 ||
    code === 2
  ) return '🌤️';

  if (code === 3) return '☁️';

  if (
    code >= 45 &&
    code <= 48
  ) return '🌫️';

  if (
    code >= 51 &&
    code <= 67
  ) return '🌧️';

  if (
    code >= 71 &&
    code <= 77
  ) return '❄️';

  if (
    code >= 80 &&
    code <= 82
  ) return '🌦️';

  if (
    code >= 95
  ) return '⛈️';

  return '🌤️';

}


function weatherDescription(
  code
) {

  if (code === 0)
    return 'Ясно';

  if (code <= 2)
    return 'Малохмарно';

  if (code === 3)
    return 'Хмарно';

  if (code <= 48)
    return 'Туман';

  if (code <= 67)
    return 'Дощ';

  if (code <= 77)
    return 'Сніг';

  if (code <= 82)
    return 'Злива';

  return 'Гроза';

}


function renderWeather(
  data
) {

  const current =
    data.current;


  const temperature =
    Math.round(
      current.temperature_2m
    );


  const code =
    current.weather_code;


  document.getElementById(
    'weatherButtonIcon'
  ).textContent =
    weatherIcon(code);


  document.getElementById(
    'weatherButtonTemperature'
  ).textContent =
    temperature +
    '°C';


  document.getElementById(
    'weatherCurrentIcon'
  ).textContent =
    weatherIcon(code);


  document.getElementById(
    'weatherCurrentTemperature'
  ).textContent =
    temperature +
    '°C';


  document.getElementById(
    'weatherCurrentDescription'
  ).textContent =
    weatherDescription(code);


  document.getElementById(
    'weatherCurrentWind'
  ).textContent =
    Math.round(
      current.wind_speed_10m
    ) +
    ' м/с';


  document.getElementById(
    'weatherCurrentPressure'
  ).textContent =
    Math.round(
      current.pressure_msl
    ) +
    ' гПа';


  document.getElementById(
    'weatherCurrentHumidity'
  ).textContent =
    current.relative_humidity_2m +
    '%';


  const daily =
    data.daily;


  const forecast =
    document.getElementById(
      'weatherForecast'
    );


  if (!forecast) return;


  forecast.innerHTML =
    '';


  for (
    let i = 0;
    i < 3;
    i++
  ) {

    const date =
      new Date(
        daily.time[i]
      );


    const title =
      i === 0
        ? 'Сьогодні'
        : date.toLocaleDateString(
            'uk-UA',
            {
              weekday:
                'short'
            }
          );


    forecast.innerHTML += `

      <div class="weather-forecast-card">

        <div>
          ${title}
        </div>

        <div style="font-size:28px">
          ${weatherIcon(
            daily.weather_code[i]
          )}
        </div>

        <strong>
          ${Math.round(
            daily.temperature_2m_max[i]
          )}°
        </strong>

        <small>
          мін. ${Math.round(
            daily.temperature_2m_min[i]
          )}°
        </small>

      </div>

    `;

  }

}


// =========================================================
// INIT
// =========================================================

document.addEventListener(
  'DOMContentLoaded',
  function() {

    applyTheme(
      getSavedTheme()
    );


    updateHeaderAvatar();


    renderRideMarkers();


    showMap();


    // Закриття модальних вікон
    // по кліку на затемнення.

    document
      .getElementById('modal')
      ?.addEventListener(
        'click',
        function(event) {

          if (
            event.target === this
          ) {

            closeModal();

          }

        }
      );


    document
      .getElementById('ridersModal')
      ?.addEventListener(
        'click',
        function(event) {

          if (
            event.target === this
          ) {

            closeRidersModal();

          }

        }
      );


    document
      .getElementById('weatherModal')
      ?.addEventListener(
        'click',
        function(event) {

          if (
            event.target === this
          ) {

            closeWeather();

          }

        }
      );


    document
      .getElementById('authModal')
      ?.addEventListener(
        'click',
        function(event) {

          if (
            event.target === this
          ) {

            closeAuthModal();

          }

        }
      );


    // Enter у пошуку адреси.

    document
      .getElementById('rideAddress')
      ?.addEventListener(
        'keydown',
        function(event) {

          if (
            event.key === 'Enter'
          ) {

            event.preventDefault();

            searchMeetingAddress();

          }

        }
      );


    // Перевірка сесії.

    if (supabaseClient) {

      supabaseClient.auth.onAuthStateChange(
        function(event, session) {

          console.log(
            'Auth:',
            event
          );

          if (
            session &&
            currentScreen === 'map'
          ) {

            updateHeaderAvatar();

          }

        }
      );

    }

  }
);