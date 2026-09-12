// =========================================================
// MOTO MAPS
// Основна логіка застосунку
// =========================================================


// =========================================================
// SUPABASE
// =========================================================

// Підключення до Supabase
const SUPABASE_URL = 'https://mthbckypfurmebncdukj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gfNOlLBzqvK-Sm9PfOzlWA_bDHq-MME';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log('Supabase підключено');


// =========================================================
// КАРТА
// =========================================================

const map = L.map('map').setView(
  [48.3794, 31.1656],
  6
);

L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
  }
).addTo(map);


// =========================================================
// ЗМІННІ
// =========================================================

let myMarker = null;
let meetingMarker = null;
let meetingLocation = null;
let choosingLocation = false;
let rideMarkers = [];


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

      map.setView([lat, lng], 15);

      if (myMarker) {

        myMarker.setLatLng([lat, lng]);

      } else {

        myMarker = L.marker([lat, lng])
          .addTo(map)
          .bindPopup('🏍️ Ви тут');

        myMarker.openPopup();
      }
    },
    function() {

      alert('Дозвольте доступ до геолокації у браузері.');

    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}


// =========================================================
// ВІКНО СТВОРЕННЯ МОТОПОЇЗДКИ
// =========================================================

function openModal() {

  choosingLocation = false;

  document.getElementById('modal').style.display = 'block';
}


function closeModal() {

  choosingLocation = false;

  document.getElementById('modal').style.display = 'none';
}


// =========================================================
// ВИБІР ТОЧКИ ЗБОРУ
// =========================================================

function chooseLocation() {

  choosingLocation = true;

  document.getElementById('modal').style.display = 'none';

  alert('Оберіть точку збору на карті.');

  map.once('click', function(e) {

    meetingLocation = {
      lat: e.latlng.lat,
      lng: e.latlng.lng
    };

    if (meetingMarker) {
      map.removeLayer(meetingMarker);
    }

    meetingMarker = L.marker([
      meetingLocation.lat,
      meetingLocation.lng
    ])
      .addTo(map)
      .bindPopup('🏍️ Точка збору')
      .openPopup();

    choosingLocation = false;

    document.getElementById('modal').style.display = 'block';

    document.getElementById('locationStatus').textContent =
      '📍 Точку збору вибрано';
  });
}


// =========================================================
// РОБОТА З ЛОКАЛЬНИМИ МОТОПОЇЗДКАМИ
// Тимчасово залишаємо локальне збереження.
// Наступним етапом перенесемо мотопоїздки в Supabase.
// =========================================================

function getRides() {

  const saved = localStorage.getItem('motoRides');

  if (saved) {

    try {

      const rides = JSON.parse(saved);

      if (Array.isArray(rides)) {
        return rides;
      }

    } catch (error) {

      console.log(
        'Помилка читання списку мотопоїздок.'
      );
    }
  }

  // Перенесення старого формату мотопоїздки.

  const oldRide = localStorage.getItem('motoRide');

  if (oldRide) {

    try {

      const ride = JSON.parse(oldRide);

      ride.id = ride.id || Date.now();

      const rides = [ride];

      localStorage.setItem(
        'motoRides',
        JSON.stringify(rides)
      );

      localStorage.removeItem('motoRide');

      return rides;

    } catch (error) {

      console.log(
        'Не вдалося перенести стару мотопоїздку.'
      );
    }
  }

  return [];
}


function saveRides(rides) {

  localStorage.setItem(
    'motoRides',
    JSON.stringify(rides)
  );
}


// =========================================================
// СТВОРЕННЯ МОТОПОЇЗДКИ
// =========================================================

function saveRide() {

  const name =
    document.getElementById('rideName').value.trim();

  const date =
    document.getElementById('rideDate').value.trim();

  const time =
    document.getElementById('rideTime').value.trim();

  const people =
    document.getElementById('ridePeople').value;

  if (!name) {

    alert('Введіть назву мотопоїздки.');

    return;
  }

  if (!date || !time) {

    alert('Вкажіть дату та час.');

    return;
  }

  if (!meetingLocation) {

    alert(
      'Спочатку виберіть точку збору на карті.'
    );

    return;
  }

  const ride = {

    id: Date.now(),

    name: name,

    date: date,

    time: time,

    people: people,

    lat: meetingLocation.lat,

    lng: meetingLocation.lng
  };

  const rides = getRides();

  rides.push(ride);

  saveRides(rides);

  closeModal();

  // Очищення форми.

  document.getElementById('rideName').value = '';

  document.getElementById('rideDate').value = '';

  document.getElementById('rideTime').value = '';

  document.getElementById('ridePeople').value = '10';

  meetingLocation = null;

  if (meetingMarker) {

    map.removeLayer(meetingMarker);

    meetingMarker = null;
  }

  document.getElementById('locationStatus').textContent =
    '📍 Точку збору ще не вибрано';

  showRides();
}


// =========================================================
// СПИСОК МОТОПОЇЗДОК
// =========================================================

function showRides() {

  hideAllSections();

  document.getElementById('map').style.display = 'block';

  document.getElementById('rideList').style.display = 'block';

  const rides = getRides();

  const rideList =
    document.getElementById('rideList');

  if (rides.length === 0) {

    rideList.innerHTML = `
      <div class="ride-card">

        <h3>
          🏍️ Мотопоїздок поки немає
        </h3>

        <div class="ride-info">
          Створи першу мотопоїздку.
        </div>

      </div>
    `;

    createAllRideMarkers();

    return;
  }

  rideList.innerHTML = '';

  // Нові мотопоїздки показуємо першими.

  rides
    .slice()
    .reverse()
    .forEach(function(ride) {

      const card =
        document.createElement('div');

      card.className = 'ride-card';

      card.innerHTML = `

        <h3>
          🏍️ ${escapeHtml(ride.name)}
        </h3>

        <div class="ride-info">

          📅 ${escapeHtml(ride.date)}
          <br>

          🕐 ${escapeHtml(ride.time)}
          <br>

          👥 До ${escapeHtml(ride.people)}
          учасників
          <br>

          📍 Точку збору вибрано

        </div>

        <div class="ride-actions">

          <button
            onclick="openRideOnMap(${ride.id})"
          >
            🗺️ На карті
          </button>

          <button
            onclick="joinRide(${ride.id})"
          >
            🏍️ Приєднатися
          </button>

        </div>
      `;

      rideList.appendChild(card);
    });

  createAllRideMarkers();
}


// =========================================================
// МАРКЕРИ МОТОПОЇЗДОК
// =========================================================

function createAllRideMarkers() {

  rideMarkers.forEach(function(item) {

    if (item.marker) {
      map.removeLayer(item.marker);
    }
  });

  rideMarkers = [];

  const rides = getRides();

  rides.forEach(function(ride) {

    const marker = L.marker([
      ride.lat,
      ride.lng
    ])
      .addTo(map)
      .bindPopup(`

        🏍️ <b>
          ${escapeHtml(ride.name)}
        </b>

        <br>

        📅 ${escapeHtml(ride.date)}

        <br>

        🕐 ${escapeHtml(ride.time)}

        <br>

        👥 До ${escapeHtml(ride.people)}
        учасників

      `);

    rideMarkers.push({

      id: ride.id,

      marker: marker
    });
  });
}


// =========================================================
// ВІДКРИТИ МОТОПОЇЗДКУ НА КАРТІ
// =========================================================

function openRideOnMap(rideId) {

  const rides = getRides();

  const ride = rides.find(function(item) {

    return Number(item.id) ===
      Number(rideId);
  });

  if (!ride) {
    return;
  }

  showMap();

  map.setView(
    [ride.lat, ride.lng],
    14
  );

  createAllRideMarkers();

  const item = rideMarkers.find(function(entry) {

    return Number(entry.id) ===
      Number(rideId);
  });

  if (item) {

    item.marker.openPopup();
  }
}


// =========================================================
// КАРТА
// =========================================================

function showMap() {

  hideAllSections();

  document.getElementById('map').style.display =
    'block';

  document.getElementById('homeRide').style.display =
    'block';

  setTimeout(function() {

    map.invalidateSize();

    createAllRideMarkers();

  }, 100);
}


// =========================================================
// ЛОКАЛЬНИЙ ЧАТ
// Тимчасово залишаємо локальне збереження.
// Наступним етапом підключимо messages до Supabase.
// =========================================================

function getChatMessages() {

  const saved =
    localStorage.getItem('motoChat');

  if (!saved) {
    return [];
  }

  try {

    const messages =
      JSON.parse(saved);

    return Array.isArray(messages)
      ? messages
      : [];

  } catch (error) {

    return [];
  }
}


function saveChatMessages(messages) {

  localStorage.setItem(
    'motoChat',
    JSON.stringify(messages)
  );
}


function showChat() {

  hideAllSections();

  document.getElementById('chat').style.display =
    'block';

  renderChat();
}


function renderChat() {

  const chat =
    document.getElementById('chat');

  const messages =
    getChatMessages();

  const profile =
    getProfile();

  let messagesHtml = '';

  if (messages.length === 0) {

    messagesHtml = `

      <div class="ride-card">

        <div class="ride-info">

          💬 Повідомлень поки немає.
          Будь першим!

        </div>

      </div>

    `;

  } else {

    messagesHtml = `

      <div class="ride-card">

        <div class="chat-messages">

          ${messages.map(function(message) {

            return `

              <div class="chat-message">

                <div class="chat-author">

                  ${escapeHtml(
                    message.author
                  )}

                </div>

                <div>

                  ${escapeHtml(
                    message.text
                  )}

                </div>

                <div class="chat-time">

                  ${escapeHtml(
                    message.time
                  )}

                </div>

              </div>

            `;

          }).join('')}

        </div>

      </div>

    `;
  }

  chat.innerHTML = `

    <div class="ride-card">

      <h2>
        💬 Чат Moto Maps
      </h2>

      <div class="ride-info">

        Зараз це локальний чат
        на цьому пристрої.

      </div>

    </div>

    ${messagesHtml}

    <div class="ride-card">

      <form
        class="chat-form"
        onsubmit="sendMessage(event)"
      >

        <input
          id="chatInput"
          type="text"
          maxlength="500"
          placeholder="Напиши повідомлення..."
          autocomplete="off"
        >

        <button type="submit">
          Надіслати
        </button>

      </form>

    </div>

  `;
}


function sendMessage(event) {

  event.preventDefault();

  const input =
    document.getElementById('chatInput');

  const text =
    input.value.trim();

  if (!text) {
    return;
  }

  const profile =
    getProfile();

  const messages =
    getChatMessages();

  messages.push({

    id: Date.now(),

    author:
      profile.nickname || 'Moto Rider',

    text: text,

    time:
      new Date().toLocaleString('uk-UA')
  });

  saveChatMessages(messages);

  renderChat();
}


// =========================================================
// ПРОФІЛЬ
// =========================================================

function getProfile() {

  const saved =
    localStorage.getItem('motoProfile');

  const defaultProfile = {

    nickname: 'Moto Rider',

    bike: 'Поки не вказано',

    city: 'Поки не вказано',

    about: 'Не заповнено'
  };

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


function showProfile() {

  hideAllSections();

  document.getElementById('profile').style.display =
    'block';

  renderProfile();
}


function renderProfile() {

  const profile =
    getProfile();

  const rides =
    getRides();

  document.getElementById('profile').innerHTML = `

    <div class="ride-card">

      <h2>
        👤 Мій профіль
      </h2>

      <br>

      <p>
        🏍️ <b>Нік:</b>
        ${escapeHtml(profile.nickname)}
      </p>

      <br>

      <p>
        🏍️ <b>Мотоцикл:</b>
        ${escapeHtml(profile.bike)}
      </p>

      <br>

      <p>
        📍 <b>Місто:</b>
        ${escapeHtml(profile.city)}
      </p>

      <br>

      <p>
        📝 <b>Про себе:</b>
      </p>

      <p class="profile-about">

        ${escapeHtml(profile.about)}

      </p>

      <br>

      <p>
        🏁 <b>Створено мотопоїздок:</b>
        ${rides.length}
      </p>

      <br>

      <button
        class="create-btn"
        onclick="editProfile()"
      >
        ✏️ Редагувати профіль
      </button>

      <button
        class="secondary-btn"
        onclick="showRegistration()"
      >
        👤 Реєстрація / новий користувач
      </button>

    </div>

  `;
}


// =========================================================
// РЕДАГУВАННЯ ЛОКАЛЬНОГО ПРОФІЛЮ
// =========================================================

function editProfile() {

  const profile =
    getProfile();

  const nickname =
    prompt(
      'Введіть ваш нік:',
      profile.nickname
    );

  if (!nickname) {
    return;
  }

  const bike =
    prompt(
      'Ваш мотоцикл:',
      profile.bike
    );

  const city =
    prompt(
      'Ваше місто:',
      profile.city
    );

  const about =
    prompt(
      'Коротко про себе:',
      profile.about
    );

  localStorage.setItem(
    'motoProfile',
    JSON.stringify({

      nickname: nickname,

      bike:
        bike || 'Не вказано',

      city:
        city || 'Не вказано',

      about:
        about || 'Не заповнено'
    })
  );

  renderProfile();
}


// =========================================================
// РЕЄСТРАЦІЯ КОРИСТУВАЧА
// Supabase Auth + profiles + motorcycles
// =========================================================

function showRegistration() {

  hideAllSections();

  document.getElementById('profile').style.display =
    'block';

  document.getElementById('profile').innerHTML = `

    <div class="ride-card auth-card">

      <h2>
        👤 Реєстрація Moto Maps
      </h2>

      <p class="ride-info">

        Створи обліковий запис Moto Maps.
        Дані будуть збережені у спільній базі.

      </p>

      <br>

      <label for="regEmail">
        Email
      </label>

      <input
        id="regEmail"
        type="email"
        maxlength="120"
        placeholder="example@email.com"
        autocomplete="email"
      >

      <label for="regPassword">
        Пароль
      </label>

      <input
        id="regPassword"
        type="password"
        minlength="6"
        maxlength="100"
        placeholder="Мінімум 6 символів"
        autocomplete="new-password"
      >

      <label for="regNickname">
        Нік
      </label>

      <input
        id="regNickname"
        type="text"
        maxlength="40"
        placeholder="Наприклад: Moto Rider"
      >

      <label for="regBike">
        Мотоцикл
      </label>

      <input
        id="regBike"
        type="text"
        maxlength="60"
        placeholder="Наприклад: Honda CB500"
      >

      <label for="regCity">
        Місто
      </label>

      <input
        id="regCity"
        type="text"
        maxlength="60"
        placeholder="Наприклад: Запоріжжя"
      >

      <label for="regAbout">
        Про себе
      </label>

      <textarea
        id="regAbout"
        maxlength="300"
        placeholder="Коротко про себе"
      ></textarea>

      <button
        class="create-btn"
        onclick="registerUser()"
      >
        👤 Зареєструватися
      </button>

      <button
        class="cancel-btn"
        onclick="showProfile()"
      >
        Назад до профілю
      </button>

    </div>

  `;
}


// =========================================================
// СТВОРЕННЯ КОРИСТУВАЧА В SUPABASE
// =========================================================

async function registerUser() {

  const email =
    document.getElementById('regEmail')
      .value
      .trim();

  const password =
    document.getElementById('regPassword')
      .value;

  const nickname =
    document.getElementById('regNickname')
      .value
      .trim();

  const bike =
    document.getElementById('regBike')
      .value
      .trim();

  const city =
    document.getElementById('regCity')
      .value
      .trim();

  const about =
    document.getElementById('regAbout')
      .value
      .trim();


  // Перевірка даних.

  if (!email) {

    alert('Введіть email.');

    return;
  }

  if (password.length < 6) {

    alert(
      'Пароль повинен містити щонайменше 6 символів.'
    );

    return;
  }

  if (!nickname) {

    alert('Введіть нік.');

    return;
  }


  try {

    // Створення користувача
    // у Supabase Authentication.

    const {
      data,
      error
    } = await supabaseClient.auth.signUp({

      email: email,

      password: password
    });


    if (error) {

      console.error(
        'Помилка реєстрації:',
        error
      );

      alert(
        'Помилка реєстрації: ' +
        error.message
      );

      return;
    }


    if (!data.user) {

      alert(
        'Користувача не вдалося створити.'
      );

      return;
    }


    const userId =
      data.user.id;


    // Створення профілю.

    const {
      error: profileError
    } = await supabaseClient
      .from('profiles')
      .insert({

        id: userId,

        nickname: nickname,

        city:
          city || null,

        about:
          about || null
      });


    if (profileError) {

      console.error(
        'Помилка створення профілю:',
        profileError
      );

      alert(
        'Користувача створено, але профіль не збережено: ' +
        profileError.message
      );

      return;
    }


    // Додаємо мотоцикл,
    // якщо користувач його вказав.

    if (bike) {

      const {
        error: motorcycleError
      } = await supabaseClient
        .from('motorcycles')
        .insert({

          user_id: userId,

          brand: bike,

          model: 'Не вказано'
        });


      if (motorcycleError) {

        console.error(
          'Помилка додавання мотоцикла:',
          motorcycleError
        );

        alert(
          'Користувача та профіль створено. ' +
          'Мотоцикл не вдалося зберегти.'
        );

      }
    }


    // Зберігаємо базову інформацію
    // локально для відображення профілю
    // у поточній версії.

    localStorage.setItem(
      'motoProfile',
      JSON.stringify({

        id: userId,

        nickname: nickname,

        bike:
          bike || 'Не вказано',

        city:
          city || 'Не вказано',

        about:
          about || 'Не заповнено',

        email: email
      })
    );


    console.log(
      'Користувача успішно зареєстровано:',
      userId
    );


    alert(
      '✅ Реєстрацію успішно завершено!'
    );


    showProfile();


  } catch (error) {

    console.error(
      'Несподівана помилка:',
      error
    );

    alert(
      'Сталася помилка під час реєстрації.'
    );
  }
}


// =========================================================
// ПРИЄДНАННЯ ДО МОТОПОЇЗДКИ
// Поки локальна заглушка.
// =========================================================

function joinRide(rideId) {

  const rides =
    getRides();

  const ride =
    rides.find(function(item) {

      return Number(item.id) ===
        Number(rideId);
    });

  if (!ride) {
    return;
  }

  alert(

    '🏍️ Ти обрав мотопоїздку «' +

    ride.name +

    '». ' +

    'Підключення учасників до Supabase ' +

    'зробимо наступним етапом.'

  );
}


// =========================================================
// СЛУЖБОВІ ФУНКЦІЇ
// =========================================================

function hideAllSections() {

  document.getElementById('homeRide').style.display =
    'none';

  document.getElementById('rideList').style.display =
    'none';

  document.getElementById('chat').style.display =
    'none';

  document.getElementById('profile').style.display =
    'none';
}


function escapeHtml(value) {

  return String(value)

    .replace(
      /&/g,
      '&amp;'
    )

    .replace(
      /</g,
      '&lt;'
    )

    .replace(
      />/g,
      '&gt;'
    )

    .replace(
      /"/g,
      '&quot;'
    )

    .replace(
      /'/g,
      '&#039;'
    );
}


// =========================================================
// ЗАПУСК
// =========================================================

window.addEventListener(
  'load',
  function() {

    // Перевіряємо старі локальні мотопоїздки.

    getRides();

    // Створюємо маркери.

    createAllRideMarkers();

    // Відображаємо профіль.

    renderProfile();
  }
);