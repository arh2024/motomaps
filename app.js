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

const MAP_STYLES = {
  dark: 'https://tiles.openfreemap.org/styles/dark',
  light: 'https://tiles.openfreemap.org/styles/liberty'
};

let activeMapStyle = MAP_STYLES[getSavedTheme()];

const map = new maplibregl.Map({
  container: 'map',
  style: activeMapStyle,
  center: [35.1396, 47.8388],
  zoom: 12
});

const DARK_ROAD_COLOR = [
  'match',
  ['get', 'class'],
  'motorway', '#d0d0d0',
  'motorway_link', '#c3c3c3',
  'trunk', '#b8b8b8',
  'primary', '#adadad',
  'secondary', '#999999',
  'tertiary', '#858585',
  'minor', '#737373',
  'service', '#626262',
  'track', '#707070',
  'path', '#686868',
  'cycleway', '#808080',
  'pedestrian', '#8a8a8a',
  '#777777'
];

// Кольори тексту карти — змінюй HEX-коди тут.
const DARK_ROAD_LABEL_COLOR = '#f2f2f2';
const DARK_ROAD_LABEL_HALO_COLOR = '#171717';
const DARK_CITY_LABEL_COLOR = '#f5f5f5';
const DARK_PLACE_LABEL_COLOR = '#d0d0d0';
const DARK_PLACE_LABEL_HALO_COLOR = '#181818';

function applyDarkMapColors() {
  if (activeMapStyle !== MAP_STYLES.dark) {
    return;
  }

  const layers = map.getStyle()?.layers || [];

  layers.forEach(function(layer) {
    if (layer.type === 'background') {
      map.setPaintProperty(layer.id, 'background-color', '#181818');
    }

    if (
      layer.type === 'line' &&
      layer['source-layer'] === 'transportation' &&
      /road|path/i.test(layer.id)
    ) {
      map.setPaintProperty(
        layer.id,
        'line-color',
        DARK_ROAD_COLOR
      );
    }

    if (
      layer.type === 'fill' &&
      layer['source-layer'] === 'building'
    ) {
      map.setPaintProperty(layer.id, 'fill-color', '#383838');
      map.setPaintProperty(layer.id, 'fill-outline-color', '#505050');
    }

    if (
      layer.type === 'fill' &&
      layer['source-layer'] === 'water'
    ) {
      map.setPaintProperty(layer.id, 'fill-color', '#070707');
    }

    if (
      layer.type === 'line' &&
      layer['source-layer'] === 'waterway'
    ) {
      map.setPaintProperty(layer.id, 'line-color', '#0d0d0d');
    }

    if (
      layer.type === 'fill' &&
      layer['source-layer'] === 'landuse'
    ) {
      map.setPaintProperty(layer.id, 'fill-color', '#222222');
    }

    if (
      layer.type === 'fill' &&
      layer['source-layer'] === 'landcover'
    ) {
      map.setPaintProperty(layer.id, 'fill-color', [
        'match',
        ['get', 'class'],
        'wood', '#1d1d1d',
        'grass', '#252525',
        '#202020'
      ]);
    }

    if (
      layer.id === 'Road labels' &&
      layer.type === 'symbol'
    ) {
      map.setPaintProperty(
        layer.id,
        'text-color',
        DARK_ROAD_LABEL_COLOR
      );
      map.setPaintProperty(
        layer.id,
        'text-halo-color',
        DARK_ROAD_LABEL_HALO_COLOR
      );
      map.setPaintProperty(layer.id, 'text-halo-width', 1.5);
    }

    if (
      (layer.id === 'Place labels' || layer.id === 'City labels') &&
      layer.type === 'symbol'
    ) {
      map.setPaintProperty(
        layer.id,
        'text-color',
        layer.id === 'City labels'
          ? DARK_CITY_LABEL_COLOR
          : DARK_PLACE_LABEL_COLOR
      );
      map.setPaintProperty(
        layer.id,
        'text-halo-color',
        DARK_PLACE_LABEL_HALO_COLOR
      );
      map.setPaintProperty(layer.id, 'text-halo-width', 1.75);
    }

  });
}

map.on('style.load', function() {
  applyDarkMapColors();
  addActiveRouteLayer();
});


// OpenFreeMap надає окремі стилі для світлої та темної теми.


// =========================================================
// ЗМІННІ
// =========================================================

let myMarker = null;

let activeRouteGeoJSON = null;

let activeRouteDestination = null;

let activeRouteOrigin = null;

let activeRouteName = '';

let routeRequestSerial = 0;

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

const systemThemeQuery = window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

function getThemeMode() {
  const savedMode = localStorage.getItem('motoTheme');
  return ['auto', 'light', 'dark'].includes(savedMode)
    ? savedMode
    : 'auto';
}

function getSystemTheme() {
  return systemThemeQuery && systemThemeQuery.matches
    ? 'dark'
    : 'light';
}

function getSavedTheme() {
  const mode = getThemeMode();
  return mode === 'auto' ? getSystemTheme() : mode;
}


function applyTheme(theme, savePreference = true) {

  const safeTheme =
    theme === 'light'
      ? 'light'
      : 'dark';

  document.documentElement.dataset.theme =
    safeTheme;

  const nextMapStyle =
    MAP_STYLES[safeTheme];

  if (activeMapStyle !== nextMapStyle) {
    activeMapStyle = nextMapStyle;
    map.setStyle(activeMapStyle);
  }

  if (savePreference) {
    localStorage.setItem('motoTheme', safeTheme);
  }
  const themeToggleIcon =
  document.getElementById('themeToggleIcon');

if (themeToggleIcon) {
  themeToggleIcon.innerHTML = `
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M10.1 2.4h3.8v3.2h-3.8z"></path>
      <circle cx="12" cy="13" r="5.3"></circle>
      <path d="M12 20.1v2.1"></path>
      <path d="m5.2 6.2 1.6 1.6"></path>
      <path d="m17.2 17.2 1.6 1.6"></path>
      <path d="M2.5 12.8h2.2"></path>
      <path d="M19.3 12.8h2.2"></path>
      <path d="m5.2 19 1.6-1.6"></path>
      <path d="m17.2 8 1.6-1.6"></path>
    </svg>
  `;
}

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

function setThemeMode(mode) {
  const safeMode = ['auto', 'light', 'dark'].includes(mode)
    ? mode
    : 'auto';

  localStorage.setItem('motoTheme', safeMode);
  applyTheme(safeMode === 'auto' ? getSystemTheme() : safeMode, false);

  const label = document.getElementById('themeLabel');
  if (label) {
    label.textContent = safeMode === 'auto'
      ? `Автоматично (${getSavedTheme() === 'dark' ? 'темна' : 'світла'})`
      : safeMode === 'light' ? 'Світла' : 'Темна';
  }
}

if (systemThemeQuery) {
  systemThemeQuery.addEventListener('change', function() {
    if (getThemeMode() === 'auto') {
      applyTheme(getSystemTheme(), false);
      const label = document.getElementById('themeLabel');
      if (label) {
        label.textContent = `Автоматично (${getSavedTheme() === 'dark' ? 'темна' : 'світла'})`;
      }
    }
  });
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
    alert('Ваш браузер не підтримує геолокацію.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function(position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Переміщуємо карту до поточного місцезнаходження
      map.flyTo({
        center: [lng, lat],
        zoom: 15
      });

      // Створюємо елемент маркера
      if (!myMarker) {
        const markerElement = document.createElement('div');

        markerElement.className = 'my-location-marker';
        markerElement.innerHTML =
          '<div class="my-location-dot"></div>';

        myMarker = new maplibregl.Marker({
          element: markerElement,
          anchor: 'center'
        })
          .setLngLat([lng, lat])
          .setPopup(
            new maplibregl.Popup({ offset: 16 })
              .setText('🏍️ Ви тут')
          )
          .addTo(map);

        myMarker.togglePopup();
      } else {
        // Оновлюємо позицію наявного маркера
        myMarker.setLngLat([lng, lat]);
      }
    },

    function(error) {
      console.error('Геолокація:', error);

      if (error.code === 1) {
        alert('Дозвольте доступ до геолокації у браузері.');
      } else if (error.code === 2) {
        alert('Не вдалося визначити ваше місцезнаходження.');
      } else if (error.code === 3) {
        alert('Час очікування GPS вичерпано. Спробуйте ще раз.');
      } else {
        alert('Помилка визначення місцезнаходження.');
      }
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

function getCurrentCoordinates() {
  return new Promise(function(resolve, reject) {
    if (!navigator.geolocation) {
      reject(new Error('Браузер не підтримує геолокацію.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function(position) {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      function(error) {
        const messages = {
          1: 'Дозвольте доступ до геолокації, щоб побудувати маршрут.',
          2: 'Не вдалося визначити місцезнаходження.',
          3: 'GPS не відповів вчасно. Спробуйте ще раз.'
        };
        reject(new Error(messages[error.code] || 'Не вдалося отримати координати GPS.'));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );
  });
}

function setRoutePanel(title, status, distance, duration) {
  const panel = document.getElementById('routeInfoPanel');
  if (!panel) return;

  document.getElementById('routeInfoTitle').textContent = title;
  document.getElementById('routeInfoStatus').textContent = status || '';
  document.getElementById('routeDistance').textContent = distance || '';
  document.getElementById('routeDuration').textContent = duration || '';
  panel.hidden = false;
  panel.style.display = 'flex';
}

function formatRouteDistance(meters) {
  const kilometers = meters / 1000;
  return kilometers < 10
    ? `${kilometers.toFixed(1)} км`
    : `${Math.round(kilometers)} км`;
}

function formatRouteDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours
    ? `${hours} год ${remainingMinutes} хв`
    : `${minutes} хв`;
}

function addActiveRouteLayer() {
  if (!activeRouteGeoJSON || !map.isStyleLoaded()) return;

  if (map.getLayer('active-ride-route')) {
    map.removeLayer('active-ride-route');
  }
  if (map.getSource('active-ride-route')) {
    map.removeSource('active-ride-route');
  }

  map.addSource('active-ride-route', {
    type: 'geojson',
    data: activeRouteGeoJSON
  });

  const firstSymbolLayer = map.getStyle().layers.find(function(layer) {
    return layer.type === 'symbol';
  });

  const routeLayer = {
    id: 'active-ride-route',
    type: 'line',
    source: 'active-ride-route',
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#18d9dc',
      'line-width': [
        'interpolate', ['linear'], ['zoom'],
        8, 4,
        15, 7
      ],
      'line-opacity': 0.95
    }
  };

  if (firstSymbolLayer) {
    map.addLayer(routeLayer, firstSymbolLayer.id);
  } else {
    map.addLayer(routeLayer);
  }
}

function clearRideRoute() {
  routeRequestSerial += 1;
  activeRouteGeoJSON = null;
  activeRouteOrigin = null;
  activeRouteDestination = null;
  activeRouteName = '';

  if (map.getLayer('active-ride-route')) {
    map.removeLayer('active-ride-route');
  }
  if (map.getSource('active-ride-route')) {
    map.removeSource('active-ride-route');
  }

  const panel = document.getElementById('routeInfoPanel');
  if (panel) {
    panel.hidden = true;
    panel.style.display = 'none';
  }
}

async function routeToRide(lat, lng, encodedName) {
  const destination = { lat: Number(lat), lng: Number(lng) };
  if (
    !Number.isFinite(destination.lat) ||
    !Number.isFinite(destination.lng) ||
    Math.abs(destination.lat) > 90 ||
    Math.abs(destination.lng) > 180
  ) {
    activeRouteDestination = null;
    setRoutePanel('Маршрут до мотопоїздки', 'Для цієї поїздки не задано координати точки збору.');
    return;
  }

  if (currentScreen !== 'map') {
    showMap();
  }

  activeRouteDestination = destination;
  try {
    activeRouteName = decodeURIComponent(encodedName || '') || 'точки збору';
  } catch (error) {
    activeRouteName = 'точки збору';
  }

  const requestId = ++routeRequestSerial;
  activeRouteGeoJSON = null;
  activeRouteOrigin = null;
  if (map.getLayer('active-ride-route')) map.removeLayer('active-ride-route');
  if (map.getSource('active-ride-route')) map.removeSource('active-ride-route');
  setRoutePanel(`До: ${activeRouteName}`, 'Визначаємо ваше місцезнаходження…');

  try {
    const origin = await getCurrentCoordinates();
    if (requestId !== routeRequestSerial) return;
    activeRouteOrigin = origin;

    if (!myMarker) {
      const markerElement = document.createElement('div');
      markerElement.className = 'my-location-marker';
      markerElement.innerHTML = '<div class="my-location-dot"></div>';
      myMarker = new maplibregl.Marker({ element: markerElement, anchor: 'center' })
        .setLngLat([origin.lng, origin.lat])
        .addTo(map);
    } else {
      myMarker.setLngLat([origin.lng, origin.lat]);
    }

    setRoutePanel(`До: ${activeRouteName}`, 'Будуємо найшвидший маршрут…');

    const routeUrl =
      'https://router.project-osrm.org/route/v1/driving/' +
      `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
      '?overview=full&geometries=geojson&steps=false';
    const response = await fetch(routeUrl);
    if (!response.ok) throw new Error('Сервіс маршрутів тимчасово недоступний.');

    const result = await response.json();
    if (requestId !== routeRequestSerial) return;
    if (result.code !== 'Ok' || !result.routes || !result.routes.length) {
      throw new Error('Не вдалося знайти автомобільний маршрут до точки збору.');
    }

    const route = result.routes[0];
    activeRouteGeoJSON = {
      type: 'Feature',
      properties: {},
      geometry: route.geometry
    };
    addActiveRouteLayer();

    const bounds = new maplibregl.LngLatBounds();
    route.geometry.coordinates.forEach(function(coordinate) {
      bounds.extend(coordinate);
    });
    map.fitBounds(bounds, {
      padding: { top: 100, right: 70, bottom: 150, left: 50 },
      maxZoom: 15,
      duration: 700
    });

    setRoutePanel(
      `До: ${activeRouteName}`,
      'Найшвидший автомобільний маршрут',
      formatRouteDistance(route.distance),
      formatRouteDuration(route.duration)
    );
  } catch (error) {
    if (requestId !== routeRequestSerial) return;
    console.error('Помилка побудови маршруту:', error);
    setRoutePanel(
      `До: ${activeRouteName}`,
      `${error.message} Можна відкрити маршрут у Google Maps.`
    );
  }
}

function openGoogleMapsRoute() {
  if (!activeRouteDestination) return;

  const params = new URLSearchParams({
    api: '1',
    destination: `${activeRouteDestination.lat},${activeRouteDestination.lng}`,
    travelmode: 'driving',
    dir_action: 'navigate'
  });

  if (activeRouteOrigin) {
    params.set('origin', `${activeRouteOrigin.lat},${activeRouteOrigin.lng}`);
  }

  window.open(`https://www.google.com/maps/dir/?${params.toString()}`, '_blank', 'noopener');
}

function startRideNavigation(lat, lng, encodedName, button) {
  const popup = button && button.closest('.maplibregl-popup');
  const closeButton = popup && popup.querySelector('.maplibregl-popup-close-button');
  if (closeButton) closeButton.click();

  routeToRide(lat, lng, encodedName);
  openGoogleMapsRoute();
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
    'bottomNav',
    'routeInfoPanel'

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
      'grid',

    routeInfoPanel:
      activeRouteDestination ? 'flex' : 'none'

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

// =========================================================
// ЗАКРИТТЯ ПОТОЧНОГО ЕКРАНУ
// =========================================================

function closeCurrentScreen() {

  if (currentScreen === 'rides') {
    showMap();
    return;
  }

  if (currentScreen === 'profile') {
    showMap();
    return;
  }

  if (currentScreen === 'settings') {
    showProfile();
    return;
  }

  showMap();
}


function showMap() {

  currentScreen = 'map';

  hideAllScreens();

  hideCloseButton();

  showMapInterface();

  setActiveNav('map');

  loadRideMarkersFromSupabase();

  setTimeout(function() {

  map.resize();

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

// =========================================================
// ЕКРАН МОТОПОЇЗДОК
// =========================================================

function showRides() {

  // Закриваємо екран створення мотопоїздки.
  closeModal();

  // Встановлюємо поточний екран.
  currentScreen = 'rides';

  // Повністю ховаємо інші екрани.
  hideAllScreens();

  // Ховаємо інтерфейс карти.
  hideMapInterface();

  const rides =
    document.getElementById('rides');

  if (!rides) {
    console.error(
      'Елемент #rides не знайдено.'
    );
    return;
  }

  // Показуємо тільки екран мотопоїздок.
  rides.style.display = 'block';

  // Завантажуємо мотопоїздки з Supabase.
  loadRidesFromSupabase()
    .then(function(ridesFromSupabase) {

      renderRides(
        ridesFromSupabase || []
      );

    })
    .catch(function(error) {

      console.error(
        'Помилка завантаження мотопоїздок:',
        error
      );

      const list =
        document.getElementById('ridesList');

      if (list) {

        list.innerHTML = `
          <div class="empty-state">
            <h3>
              Не вдалося завантажити мотопоїздки
            </h3>

            <p>
              Спробуйте ще раз.
            </p>
          </div>
        `;

      }

    });

}
async function joinRide(rideId) {

  if (!supabaseClient) {

    alert(
      'Supabase не підключено.'
    );

    return;

  }


  const {
    data: sessionData,
    error: sessionError
  } =
    await supabaseClient.auth.getSession();


  if (
    sessionError ||
    !sessionData.session
  ) {

    alert(
      'Потрібно увійти в акаунт.'
    );

    return;

  }


  const user =
    sessionData.session.user;


  const {
    data: existingParticipant,
    error: checkError
  } =
    await supabaseClient
      .from('ride_participants')
      .select('id')
      .eq('ride_id', rideId)
      .eq('user_id', user.id)
      .maybeSingle();


  if (checkError) {

    console.error(
      'Помилка перевірки участі:',
      checkError
    );

    alert(
      'Не вдалося перевірити участь.'
    );

    return;

  }


  if (existingParticipant) {

    alert(
      'Ви вже приєдналися до цієї мотопоїздки.'
    );

    return;

  }


  const {
    error: insertError
  } =
    await supabaseClient
      .from('ride_participants')
      .insert({

        ride_id:
          rideId,

        user_id:
          user.id,

        status:
          'joined'

      });


  if (insertError) {

    console.error(
      'Помилка приєднання до мотопоїздки:',
      insertError
    );

    alert(
      'Не вдалося приєднатися до мотопоїздки: ' +
      insertError.message
    );

    return;

  }


  alert(
    '🏍️ Ви приєдналися до мотопоїздки!'
  );

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


  if (date) {

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


/// =========================================================
// MEETING LOCATION
// =========================================================

function setMeetingLocation(lat, lng, label) {
  meetingLocation = {
    lat: Number(lat),
    lng: Number(lng),
    label: label || 'Точка збору'
  };

  if (meetingMarker) {
    meetingMarker.setLngLat([
      Number(lng),
      Number(lat)
    ]);
  } else {
    const markerElement = document.createElement('div');

    markerElement.className = 'meeting-marker';
    markerElement.textContent = '🏍️';

    meetingMarker = new maplibregl.Marker({
      element: markerElement,
      anchor: 'center',
      draggable: true
    })
      .setLngLat([
        Number(lng),
        Number(lat)
      ])
      .addTo(map);

    meetingMarker.on('dragend', function() {
      const position = meetingMarker.getLngLat();

      meetingLocation.lat = position.lat;
      meetingLocation.lng = position.lng;
      meetingLocation.label = 'Точка на карті';

      updateLocationStatus();
    });
  }

  const popup = new maplibregl.Popup({
    offset: 16
  }).setText('📍 ' + meetingLocation.label);

  meetingMarker.setPopup(popup);

  updateLocationStatus();
}

// Клік по карті

map.on(
  'click',
  function(event) {

    if (!choosingLocation) {
      return;
    }


    const lat =
      event.lngLat.lat;

    const lng =
      event.lngLat.lng;


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


  map.flyTo({
    center: [lng, lat],
    zoom: 16
  });


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


async function loadRidesFromSupabase() {

  if (!supabaseClient) {

    return [];

  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from('rides')
      .select('*')
      .eq('status', 'open')
      .order('created_at', {
        ascending: false
      });


  if (error) {

    console.error(
      'Помилка завантаження мотопоїздок:',
      error
    );

    return [];

  }


  return data || [];

}


function increaseUnreadRides() {

  const count =
    getUnreadRides() + 1;

  localStorage.setItem(
    'unreadRides',
    count
  );

}

async function getUnreadRides() {

  if (!supabaseClient) return 0;

  const {
    data: sessionData,
    error: sessionError
  } = await supabaseClient.auth.getSession();

  if (sessionError || !sessionData.session) {
    return 0;
  }

  const user = sessionData.session.user;

  const {
    count,
    error
  } = await supabaseClient
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error(
      'Помилка завантаження сповіщень:',
      error
    );
    return 0;
  }

  return count || 0;
}


function increaseUnreadRides() {

  const count =
    getUnreadRides() + 1;

  localStorage.setItem(
    'unreadRides',
    count
  );

}

async function updateNotificationsBadge() {

  const badge =
    document.getElementById(
      'notificationsBadge'
    );

  if (!badge) return;

  const count =
    await getUnreadRides();

  const button = document.getElementById('notificationsButton');
  const hasUnread = count > 0;

  if (button) {
    button.classList.toggle('has-unread', hasUnread);
    button.setAttribute(
      'aria-label',
      hasUnread
        ? `Сповіщення, нових: ${count}`
        : 'Сповіщення'
    );
  }

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


async function saveRide() {

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
    const today = new Date();
    const todayYear =
     today.getFullYear();

const todayMonth =
  String(today.getMonth() + 1).padStart(2, '0');

const todayDay =
  String(today.getDate()).padStart(2, '0');

const todayString =
  `${todayYear}-${todayMonth}-${todayDay}`;


if (date < todayString) {

  alert(
    'Не можна обрати дату в минулому.'
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


  if (!supabaseClient) {

    alert(
      'Supabase не підключено.'
    );

    return;

  }


  const {
    data: sessionData,
    error: sessionError
  } =
    await supabaseClient.auth.getSession();


  if (
    sessionError ||
    !sessionData.session
  ) {

    alert(
      'Потрібно увійти в акаунт.'
    );

    return;

  }


const user = sessionData.session.user;

const {
  data: profileData,
  error: profileError
} = await supabaseClient
  .from('profiles')
  .select('nickname, bike')
  .eq('id', user.id)
  .single();

if (profileError) {
  console.error(
    'Помилка завантаження профілю:',
    profileError
  );

  alert(
    'Не вдалося завантажити профіль: ' +
    profileError.message
  );

  return;
}


  const {
    data: savedRide,
    error
  } =
    await supabaseClient
      .from('rides')
      .insert({

        creator_id:
          user.id,

        name:
          name,

        description:
          null,

        ride_date:
          date,

        ride_time:
          time,

        meeting_lat:
          meetingLocation.lat,

        meeting_lng:
          meetingLocation.lng,

        max_people:
          Number(people) || 1,

        status:
          'open'

      })
      .select()
      .single();


  if (error) {

    console.error(
      'Помилка створення мотопоїздки:',
      error
    );

    alert(
      'Не вдалося створити мотопоїздку: ' +
      error.message
    );

    return;

  }


  const rides =
    getRides();


  const ride = {

    id:
      savedRide.id,

    name:
      savedRide.name,

    date:
      savedRide.ride_date,

    time:
      savedRide.ride_time,

    people:
      savedRide.max_people,

    location:
      meetingLocation.label,

    lat:
      savedRide.meeting_lat,

    lng:
      savedRide.meeting_lng,

    creator:
      profile.nickname ||
      'Moto Rider',

    riders: [

      {

        name:
          profileData.nickname||
          'Moto Rider',

        bike:
          profileData.bike||
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
  rideMarkers.forEach(function(marker) {
    marker.remove();
  });

  rideMarkers = [];
}

async function loadRideMarkersFromSupabase() {

  if (!supabaseClient) {

    return;

  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from('rides')
      .select('*')
      .eq('status', 'open')
      .order('created_at', {
        ascending: false
      });


  if (error) {

    console.error(
      'Помилка завантаження точок мотопоїздок:',
      error
    );

    return;

  }


  clearRideMarkers();


  (data || []).forEach(function(ride) {

    if (
      typeof ride.meeting_lat !== 'number' ||
      typeof ride.meeting_lng !== 'number'
    ) {

      return;

    }


  const popup = new maplibregl.Popup({ offset: 25 })
  .setHTML(
    `<strong>🏍️ ${escapeHtml(ride.name)}</strong><br>` +
    `📅 ${escapeHtml(formatDate(ride.ride_date))}<br>` +
    `🕐 ${escapeHtml(ride.ride_time)}<br><br>` +
    `<button type="button" class="route-popup-button" onclick="routeToRide(${Number(ride.meeting_lat)},${Number(ride.meeting_lng)},'${encodeURIComponent(ride.name || '').replace(/'/g, '%27')}')">Прокласти маршрут</button><br><br>` +
    `<button type="button" onclick="joinRide('${ride.id}')">Приєднатися</button><br><br>` +
    `<button type="button" class="route-popup-button" onclick="startRideNavigation(${Number(ride.meeting_lat)},${Number(ride.meeting_lng)},'${encodeURIComponent(ride.name || '').replace(/'/g, '%27')}',this)">Поїхали</button>`
  );

const markerElement = document.createElement('div');
markerElement.textContent = '🏍️';
markerElement.style.fontSize = '28px';
markerElement.style.cursor = 'pointer';

const marker = new maplibregl.Marker({
  element: markerElement,
  anchor: 'bottom'
})
  .setLngLat([
    Number(ride.meeting_lng),
    Number(ride.meeting_lat)
  ])
  .setPopup(popup)
  .addTo(map);


    rideMarkers.push(
      marker
    );

  });

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

const popup = new maplibregl.Popup({ offset: 25 })
  .setHTML(
    `<strong>🏍️ ${escapeHtml(ride.name)}</strong><br>` +
    `📅 ${escapeHtml(formatDate(ride.date))}<br>` +
    `🕐 ${escapeHtml(ride.time)}<br>` +
    `📍 ${escapeHtml(ride.location)}<br><br>` +
    `<button type="button" class="route-popup-button" onclick="routeToRide(${Number(ride.lat)},${Number(ride.lng)},'${encodeURIComponent(ride.name || '').replace(/'/g, '%27')}')">Прокласти маршрут</button><br><br>` +
    `<button type="button" class="route-popup-button" onclick="startRideNavigation(${Number(ride.lat)},${Number(ride.lng)},'${encodeURIComponent(ride.name || '').replace(/'/g, '%27')}',this)">Поїхали</button>`
  );

const markerElement = document.createElement('div');
markerElement.textContent = '🏍️';
markerElement.style.fontSize = '28px';
markerElement.style.cursor = 'pointer';

const marker = new maplibregl.Marker({
  element: markerElement,
  anchor: 'bottom'
})
  .setLngLat([
    Number(ride.lng),
    Number(ride.lat)
  ])
  .setPopup(popup)
  .addTo(map);

rideMarkers.push(marker);

});
}


// =========================================================
// ВІДОБРАЖЕННЯ МОТОПОЇЗДОК
// =========================================================

async function renderRides(ridesFromSupabase) {

  // Працюємо тільки з контейнером списку.
  // Сам екран #rides більше не перезаписуємо.
  const container =
    document.getElementById('ridesList');

  if (!container) return;

  const rides =
    ridesFromSupabase || [];

  let participantRows = [];
  let creatorProfiles = {};

  // =======================================================
  // УЧАСНИКИ
  // =======================================================

  if (
    supabaseClient &&
    rides.length
  ) {

    const rideIds =
      rides.map(function(ride) {
        return ride.id;
      });

    const {
      data,
      error
    } = await supabaseClient
      .from('ride_participants')
      .select(`
        ride_id,
        user_id,
        profiles (
          nickname,
          bike
        )
      `)
      .in(
        'ride_id',
        rideIds
      )
      .eq(
        'status',
        'joined'
      );

    if (error) {

      console.error(
        'Помилка завантаження учасників:',
        error
      );

    } else {

      participantRows =
        data || [];

    }

    // =====================================================
    // ПРОФІЛІ АВТОРІВ
    // =====================================================

    const creatorIds = [
      ...new Set(
        rides
          .map(function(ride) {
            return ride.creator_id;
          })
          .filter(Boolean)
      )
    ];

    if (creatorIds.length) {

      const {
        data: creatorData,
        error: creatorError
      } = await supabaseClient
        .from('profiles')
        .select(`
          id,
          nickname,
          bike
        `)
        .in(
          'id',
          creatorIds
        );

      if (creatorError) {

        console.error(
          'Помилка завантаження профілів авторів:',
          creatorError
        );

      } else {

        (creatorData || [])
          .forEach(function(profile) {

            creatorProfiles[profile.id] =
              profile;

          });

      }

    }

  }

  // =======================================================
  // НЕМАЄ МОТОПОЇЗДОК
  // =======================================================

  if (!rides.length) {

    container.innerHTML = `
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

    return;
  }

  // =======================================================
  // СПИСОК МОТОПОЇЗДОК
  // =======================================================

  let html = '';

  rides.forEach(function(ride) {

    const participants =
      participantRows.filter(
        function(item) {
          return item.ride_id === ride.id;
        }
      );

    const ridersCount =
      participants.length;

    // -----------------------------------------------------
    // ІМЕНА УЧАСНИКІВ
    // -----------------------------------------------------

    const riderNames =
      participants
        .map(function(item) {

          return (
            item.profiles &&
            item.profiles.nickname
          )
            ? item.profiles.nickname
            : 'Moto Rider';

        });

    let participantsHtml = '';

    if (riderNames.length) {

      participantsHtml = `
        <div class="ride-participants">

          <div class="ride-participants-title">
            👥 Учасники:
          </div>

          <div class="ride-participants-list">

            ${riderNames
              .map(function(name) {

                return `
                  <span class="ride-participant-name">
                    ${escapeHtml(name)}
                  </span>
                `;

              })
              .join('')}

          </div>

        </div>
      `;

    }

    // -----------------------------------------------------
    // АВТОР МОТОПОЇЗДКИ
    // -----------------------------------------------------

    const creator =
      creatorProfiles[ride.creator_id];

    const creatorName =
      creator && creator.nickname
        ? creator.nickname
        : 'Moto Rider';

    const creatorBike =
      creator && creator.bike
        ? creator.bike
        : 'Не вказано';

    const rideLatitude = Number(ride.meeting_lat);
    const rideLongitude = Number(ride.meeting_lng);
    const hasMeetingCoordinates =
      ride.meeting_lat !== null &&
      ride.meeting_lat !== undefined &&
      ride.meeting_lng !== null &&
      ride.meeting_lng !== undefined &&
      Number.isFinite(rideLatitude) &&
      Number.isFinite(rideLongitude) &&
      Math.abs(rideLatitude) <= 90 &&
      Math.abs(rideLongitude) <= 180;
    const encodedRideName = encodeURIComponent(ride.name || 'точки збору')
      .replace(/'/g, '%27');

    // -----------------------------------------------------
    // КАРТКА
    // -----------------------------------------------------

    html += `
      <article class="ride-card">

        <h3>
          🏍️ ${escapeHtml(ride.name)}
        </h3>

        <div class="ride-creator">
          👤 Створив:
          <strong>
            ${escapeHtml(creatorName)}
          </strong>
        </div>

        <div class="ride-bike">
          🏍️ Мотоцикл:
          <strong>
            ${escapeHtml(creatorBike)}
          </strong>
        </div>

        <div class="ride-meta">

          <div>
            📅
            ${escapeHtml(
              formatDate(
                ride.ride_date
              )
            )}
          </div>

          <div>
            🕐
            ${escapeHtml(
              ride.ride_time || ''
            )}
          </div>

          <div>
            👥 до
            ${escapeHtml(
              ride.max_people
            )}
          </div>

          <div>
            🏍️
            ${ridersCount}
            учасн.
          </div>

        </div>

        <div class="ride-location">

          📍
          ${escapeHtml(
            ride.location ||
            'Точку збору не вказано'
          )}

        </div>

        ${participantsHtml}

        <div class="ride-actions">

          <button
            class="ride-action"
            type="button"
            onclick="showRideRiders('${ride.id}')"
          >
            👥 Мотоциклісти
          </button>

          <button
            class="ride-action"
            type="button"
            onclick="joinRide('${ride.id}')"
          >
            🏍️ Приєднатися
          </button>

          <button
            class="ride-action"
            type="button"
            onclick="openRideOnMap('${ride.id}')"
          >
            📍 На карті
          </button>

          <button
            class="ride-action"
            type="button"
            ${hasMeetingCoordinates ? '' : 'disabled'}
            onclick="routeToRide(${rideLatitude},${rideLongitude},'${encodedRideName}')"
          >
            🧭 Маршрут
          </button>

        </div>

      </article>
    `;

  });

  // =======================================================
  // ВИВОДИМО ТІЛЬКИ СПИСОК
  // =======================================================

  container.innerHTML = html;

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


  map.flyTo({
    center: [ride.lng, ride.lat],
    zoom: 16
  });


  const marker =
    rideMarkers.find(
      function(item) {

        const position =
          item.getLngLat();

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
async function loadRideParticipantCounts(rideIds) {

  if (!supabaseClient || !rideIds.length) {

    return {};

  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from('ride_participants')
      .select('ride_id')
      .in('ride_id', rideIds)
      .eq('status', 'joined');


  if (error) {

    console.error(
      'Помилка завантаження учасників:',
      error
    );

    return {};

  }


  const counts = {};


  (data || []).forEach(function(item) {

    if (!counts[item.ride_id]) {

      counts[item.ride_id] = 0;

    }


    counts[item.ride_id]++;

  });


  return counts;

}

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

async function showProfile() {

  if (!supabaseClient) {
    openAuthModal();
    return;
  }

  const {
    data: sessionData,
    error: sessionError
  } =
    await supabaseClient.auth.getSession();

  if (
    sessionError ||
    !sessionData.session
  ) {
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

  hideCloseButton();

  const profile =
    document.getElementById('profile');

  if (!profile) return;

  profile.style.display =
    'block';

  await renderProfile();

}


// =========================================================
// RENDER PROFILE
// =========================================================

function setHeaderAvatar(avatarUrl) {
  const image = document.getElementById('headerAvatarImage');
  const fallback = document.getElementById('headerAvatarFallback');
  const avatar = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';

  if (image) {
    if (avatar) {
      image.src = avatar;
      image.hidden = false;
    } else {
      image.removeAttribute('src');
      image.hidden = true;
    }
  }

  if (fallback) {
    fallback.hidden = Boolean(avatar);
  }
}

async function updateHeaderAvatar() {
  if (!supabaseClient) {
    setHeaderAvatar('');
    return;
  }

  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

  if (sessionError || !sessionData.session) {
    setHeaderAvatar('');
    return;
  }

  const { data: profileData, error: profileError } = await supabaseClient
    .from('profiles')
    .select('avatar_url')
    .eq('id', sessionData.session.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Помилка завантаження аватара:', profileError);
    return;
  }

  setHeaderAvatar(profileData?.avatar_url || '');
}

async function renderProfile() {

  const element =
    document.getElementById('profile');

  if (!element) return;

  if (!supabaseClient) {
    openAuthModal();
    return;
  }

  const {
    data: sessionData,
    error: sessionError
  } =
    await supabaseClient.auth.getSession();

  if (
    sessionError ||
    !sessionData.session
  ) {
    openAuthModal();
    return;
  }

  const user =
    sessionData.session.user;

  const {
    data: profileData,
    error: profileError
  } =
    await supabaseClient
      .from('profiles')
      .select(`
        id,
        nickname,
        avatar_url,
        city,
        about,
        phone,
        bike
      `)
      .eq('id', user.id)
      .single();

  if (profileError) {

    console.error(
      'Помилка завантаження профілю:',
      profileError
    );

    alert(
      'Не вдалося завантажити профіль: ' +
      profileError.message
    );

    return;
  }

const nickname =
  profileData.nickname ||
  'Moto Rider';

const avatar =
  profileData.avatar_url ||
  '';
setHeaderAvatar(avatar);
  element.innerHTML = `

    <div class="profile-fullscreen">

      <div class="profile-header">

        <div>

          <span class="screen-eyebrow">
            MOTO MAPS
          </span>

          <h1>
            Вітаю,
            ${escapeHtml(nickname)}!
          </h1>

        </div>

        <button
          class="profile-close-button"
          type="button"
          onclick="showMap()"
          aria-label="Закрити"
        >
          ×
        </button>

      </div>


      <div class="profile-main">

        <button
          class="profile-avatar-button"
          type="button"
          onclick="changeProfileAvatar()"
          aria-label="Змінити аватар"
        >

          <div class="profile-avatar-large">

            ${
              avatar
                ? `
                  <img
                    src="${escapeHtml(avatar)}"
                    alt="Аватар"
                  >
                `
                : '🏍️'
            }

          </div>

        </button>


        <div class="profile-menu">


          <button
            class="profile-menu-item"
            type="button"
            onclick="showProfileDetails()"
          >

            <span class="profile-menu-icon">
              👤
            </span>

            <span class="profile-menu-text">
              Профіль
            </span>

            <span class="profile-menu-arrow">
              ›
            </span>

          </button>


          <button
            class="profile-menu-item"
            type="button"
            onclick="showRides()"
          >

            <span class="profile-menu-icon">
              🏍️
            </span>

            <span class="profile-menu-text">
              Мої мотопоїздки
            </span>

            <span class="profile-menu-arrow">
              ›
            </span>

          </button>


          <button
            class="profile-menu-item"
            type="button"
            onclick="showSecurity()"
          >

            <span class="profile-menu-icon">
              🔒
            </span>

            <span class="profile-menu-text">
              Безпека
            </span>

            <span class="profile-menu-arrow">
              ›
            </span>

          </button>


          <button
            class="profile-menu-item"
            type="button"
            onclick="showSettings()"
          >

            <span class="profile-menu-icon">
              ⚙️
            </span>

            <span class="profile-menu-text">
              Налаштування
            </span>

            <span class="profile-menu-arrow">
              ›
            </span>

          </button>


        </div>


        <button
          class="profile-logout-button"
          type="button"
          onclick="logoutUser()"
        >
          Вийти з акаунта
        </button>


      </div>

    </div>

  `;
}


// =========================================================
// PROFILE DETAILS
// =========================================================

async function editProfileField(field) {

  // Поки дозволяємо редагувати тільки ці поля
  if (
    field !== 'bike' &&
    field !== 'city' &&
    field !== 'about'
  ) {
    alert('Для цього поля ще потрібно додати підтвердження.');
    return;
  }

  if (!supabaseClient) {
    alert('Supabase не підключено.');
    return;
  }

  const {
    data: sessionData,
    error: sessionError
  } = await supabaseClient.auth.getSession();

  if (
    sessionError ||
    !sessionData.session
  ) {
    alert('Потрібно увійти в акаунт.');
    return;
  }

  const user = sessionData.session.user;

  const {
    data: profileData,
    error: profileError
  } = await supabaseClient
    .from('profiles')
    .select('bike, city, about')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error(
      'Помилка завантаження профілю:',
      profileError
    );

    alert('Не вдалося завантажити дані профілю.');
    return;
  }

  const fieldNames = {
    bike: 'Мотоцикл',
    city: 'Місто',
    about: 'Про себе'
  };

  const currentValue =
    profileData[field] || '';

  const newValue = prompt(
    fieldNames[field] + ':',
    currentValue
  );

  if (newValue === null) {
    return;
  }

  const value = newValue.trim();

  const {
    error: updateError
  } = await supabaseClient
    .from('profiles')
    .update({
      [field]: value || null
    })
    .eq('id', user.id);

  if (updateError) {
    console.error(
      'Помилка збереження профілю:',
      updateError
    );

    alert(
      'Не вдалося зберегти зміни: ' +
      updateError.message
    );

    return;
  }

  await showProfileDetails();
}


async function showProfileDetails() {

  const element =
    document.getElementById('profile');

  if (!element) {
    return;
  }

  if (!supabaseClient) {
    openAuthModal();
    return;
  }

  const {
    data: sessionData,
    error: sessionError
  } = await supabaseClient.auth.getSession();

  if (
    sessionError ||
    !sessionData.session
  ) {
    openAuthModal();
    return;
  }

  const user =
    sessionData.session.user;

  const {
    data: profileData,
    error: profileError
  } = await supabaseClient
    .from('profiles')
    .select(`
      nickname,
      bike,
      phone,
      city,
      about
    `)
    .eq('id', user.id)
    .single();

  if (profileError) {

    console.error(
      'Помилка завантаження даних профілю:',
      profileError
    );

    alert(
      'Не вдалося завантажити профіль: ' +
      profileError.message
    );

    return;
  }

  const email =
    user.email || 'Не вказано';

  element.innerHTML = `

    <div class="profile-fullscreen">

      <div class="profile-header">

        <div>
          <span class="screen-eyebrow">
            MOTO MAPS
          </span>

          <h1>
            Профіль
          </h1>
        </div>

        <button
          class="profile-close-button"
          type="button"
          onclick="showProfile()"
          aria-label="Назад"
        >
          ×
        </button>

      </div>


      <div class="profile-details">

        <button
          class="profile-detail-row"
          type="button"
          data-field="nickname"
          onclick="editProfileField('nickname')"
        >

          <span class="profile-detail-icon">
            👤
          </span>

          <span class="profile-detail-content">

            <strong>
              Нікнейм
            </strong>

            <small>
              ${escapeHtml(
                profileData.nickname ||
                'Moto Rider'
              )}
            </small>

          </span>

          <span class="profile-menu-arrow">
            ›
          </span>

        </button>


        <button
          class="profile-detail-row"
          type="button"
          data-field="bike"
          onclick="editProfileField('bike')"
        >

          <span class="profile-detail-icon">
            🏍️
          </span>

          <span class="profile-detail-content">

            <strong>
              Мотоцикл
            </strong>

            <small>
              ${escapeHtml(
                profileData.bike ||
                'Поки не вказано'
              )}
            </small>

          </span>

          <span class="profile-menu-arrow">
            ›
          </span>

        </button>


        <button
          class="profile-detail-row"
          type="button"
          data-field="phone"
          onclick="editProfileField('phone')"
        >

          <span class="profile-detail-icon">
            📱
          </span>

          <span class="profile-detail-content">

            <strong>
              Телефон
            </strong>

            <small>
              ${escapeHtml(
                profileData.phone ||
                user.phone ||
                'Не вказано'
              )}
            </small>

          </span>

          <span class="profile-menu-arrow">
            ›
          </span>

        </button>


        <button
          class="profile-detail-row"
          type="button"
          data-field="city"
          onclick="editProfileField('city')"
        >

          <span class="profile-detail-icon">
            🏙️
          </span>

          <span class="profile-detail-content">

            <strong>
              Місто
            </strong>

            <small>
              ${escapeHtml(
                profileData.city ||
                'Не вказано'
              )}
            </small>

          </span>

          <span class="profile-menu-arrow">
            ›
          </span>

        </button>


        <button
          class="profile-detail-row"
          type="button"
          data-field="about"
          onclick="editProfileField('about')"
        >

          <span class="profile-detail-icon">
            📝
          </span>

          <span class="profile-detail-content">

            <strong>
              Про себе
            </strong>

            <small>
              ${escapeHtml(
                profileData.about ||
                'Не заповнено'
              )}
            </small>

          </span>

          <span class="profile-menu-arrow">
            ›
          </span>

        </button>


        <button
          class="profile-detail-row"
          type="button"
          data-field="email"
          onclick="editProfileField('email')"
        >

          <span class="profile-detail-icon">
            ✉️
          </span>

          <span class="profile-detail-content">

            <strong>
              Email
            </strong>

            <small>
              ${escapeHtml(email)}
            </small>

          </span>

          <span class="profile-menu-arrow">
            ›
          </span>

        </button>

      </div>

    </div>

  `;
}
// =========================================================
// AVATAR
// =========================================================

async function changeProfileAvatar() {

  const input = document.createElement('input');

  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = async function(event) {

    const file = event.target.files[0];

    if (!file) return;

    await handleAvatarUpload(file);
  };

  input.click();
}


async function handleAvatarUpload(file) {

  if (!supabaseClient) {
    alert('Supabase не підключено.');
    return;
  }

  const {
    data: sessionData,
    error: sessionError
  } =
    await supabaseClient.auth.getSession();

  if (
    sessionError ||
    !sessionData.session
  ) {
    alert('Потрібно увійти в акаунт.');
    return;
  }

  const user =
    sessionData.session.user;

  const fileExt =
    file.name.split('.').pop().toLowerCase();

  const filePath =
    `${user.id}/avatar.${fileExt}`;

  const {
    error: uploadError
  } =
    await supabaseClient
      .storage
      .from('avatars')
      .upload(
        filePath,
        file,
        {
          upsert: true,
          contentType: file.type
        }
      );

  if (uploadError) {

    console.error(
      'Помилка завантаження аватара:',
      uploadError
    );

    alert(
      'Не вдалося завантажити фото: ' +
      uploadError.message
    );

    return;
  }

  const {
    data: publicUrlData
  } =
    supabaseClient
      .storage
      .from('avatars')
      .getPublicUrl(filePath);

  const avatarUrl =
    publicUrlData.publicUrl;

  const {
    error: updateError
  } =
    await supabaseClient
      .from('profiles')
      .update({
        avatar_url: avatarUrl
      })
      .eq('id', user.id);

  if (updateError) {

    console.error(
      'Помилка збереження avatar_url:',
      updateError
    );

    alert(
      'Фото завантажено, але не вдалося зберегти його в профілі.'
    );

    return;
  }

  await renderProfile();
}// =========================================================
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

  hideCloseButton();


  const settings =
    document.getElementById(
      'settings'
    );


  if (!settings) return;


  settings.style.display =
    'block';


  const theme = getSavedTheme();
  const themeMode = getThemeMode();


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
            ${themeMode === 'auto'
              ? `Автоматично (${theme === 'dark' ? 'темна' : 'світла'})`
              : theme === 'light' ? 'Світла' : 'Темна'}
          </span>

        </div>


        <select
          class="theme-mode-select"
          aria-label="Режим теми"
          onchange="setThemeMode(this.value)"
        >
          <option value="auto" ${themeMode === 'auto' ? 'selected' : ''}>Автоматично</option>
          <option value="light" ${themeMode === 'light' ? 'selected' : ''}>Світла</option>
          <option value="dark" ${themeMode === 'dark' ? 'selected' : ''}>Темна</option>
        </select>

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

      await updateHeaderAvatar();


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
      getSavedTheme(),
      false
    );


    updateHeaderAvatar();


    renderRideMarkers();


    showMap();
    updateNotificationsBadge();

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

          if (!session || event === 'SIGNED_OUT') {
            setHeaderAvatar('');
          } else if (
            event === 'SIGNED_IN' ||
            event === 'INITIAL_SESSION' ||
            event === 'USER_UPDATED'
          ) {
            // Schedule after the auth callback so Supabase can release its lock.
            setTimeout(updateHeaderAvatar, 0);
          }

        }
      );

    }

  }
);
