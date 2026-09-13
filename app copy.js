// =========================================================
// MOTO MAPS — ОСНОВНА ЛОГІКА
// =========================================================


// =========================================================
// SUPABASE
// =========================================================

// Підключення до Supabase
const SUPABASE_URL = 'https://mthbckypfurmebncdukj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gfNOlLBzqvK-Sm9PfOzlWA_bDHq-MME';

let supabaseClient = null;

if (window.supabase) {

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  console.log('Supabase підключено');

} else {

  console.warn(
    'Бібліотеку Supabase не завантажено.'
  );
}


// =========================================================
// КАРТА
// =========================================================

const map =
  L.map('map').setView(
     [47.8388, 35.1396],
    12
  );

L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
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
let rideMarkers = [];


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

        const myLocationIcon =
          L.divIcon({

            className:
              'my-location-marker',

            html:
              '<div class="my-location-dot"></div>',

            iconSize: [
              32,
              32
            ],

            iconAnchor: [
              16,
              16
            ]

          });

        myMarker =
          L.marker(
            [
              lat,
              lng
            ],
            {
              icon:
                myLocationIcon
            }
          )
            .addTo(map)
            .bindPopup(
              '🏍️ Ви тут'
            );

        myMarker.openPopup();
      }
    },

    function(error) {

      console.error(
        'Помилка геолокації:',
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
// МОДАЛЬНЕ ВІКНО
// =========================================================

function openModal() {

  const modal =
    document.getElementById('modal');

  if (modal) {

    modal.style.display =
      'flex';
  }
}


function closeModal() {

  const modal =
    document.getElementById('modal');

  if (modal) {

    modal.style.display =
      'none';
  }
}


document.addEventListener(
  'click',
  function(event) {

    const modal =
      document.getElementById('modal');

    if (
      modal &&
      event.target === modal &&
      modal.style.display !== 'none'
    ) {

      closeModal();
    }
  }
);


// =========================================================
// ВИБІР ТОЧКИ ЗБОРУ
// =========================================================

function chooseLocation() {

  const modal =
    document.getElementById('modal');

  if (modal) {

    modal.style.display =
      'none';
  }

  alert(
    'Оберіть точку збору на карті.'
  );

  map.once(
    'click',
    function(e) {

      meetingLocation = {

        lat:
          e.latlng.lat,

        lng:
          e.latlng.lng
      };

      if (meetingMarker) {

        map.removeLayer(
          meetingMarker
        );
      }

      meetingMarker =
        L.marker([
          meetingLocation.lat,
          meetingLocation.lng
        ])
          .addTo(map)
          .bindPopup(
            '🏍️ Точка збору'
          )
          .openPopup();

      if (modal) {

        modal.style.display =
          'flex';
      }

      const status =
        document.getElementById(
          'locationStatus'
        );

      if (status) {

        status.textContent =
          '📍 Точку збору вибрано';
      }
    }
  );
}


// =========================================================
// МОТОПОЇЗДКИ
// =========================================================

function getRides() {

  const saved =
    localStorage.getItem(
      'motoRides'
    );

  if (!saved) {

    return [];
  }

  try {

    const rides =
      JSON.parse(saved);

    return Array.isArray(rides)
      ? rides
      : [];

  } catch (error) {

    console.error(
      'Помилка читання мотопоїздок:',
      error
    );

    return [];
  }
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

  const nameElement =
    document.getElementById(
      'rideName'
    );

  const dateElement =
    document.getElementById(
      'rideDate'
    );

  const timeElement =
    document.getElementById(
      'rideTime'
    );

  const peopleElement =
    document.getElementById(
      'ridePeople'
    );

  if (
    !nameElement ||
    !dateElement ||
    !timeElement ||
    !peopleElement
  ) {

    return;
  }

  const name =
    nameElement.value.trim();

  const date =
    dateElement.value.trim();

  const time =
    timeElement.value.trim();

  const people =
    peopleElement.value;

  if (!name) {

    alert(
      'Введіть назву мотопоїздки.'
    );

    return;
  }

  if (!date || !time) {

    alert(
      'Вкажіть дату та час.'
    );

    return;
  }

  if (!meetingLocation) {

    alert(
      'Спочатку виберіть точку збору на карті.'
    );

    return;
  }

  const rides =
    getRides();

  rides.push({

    id:
      Date.now(),

    name:
      name,

    date:
      date,

    time:
      time,

    people:
      people,

    lat:
      meetingLocation.lat,

    lng:
      meetingLocation.lng
  });

  saveRides(
    rides
  );

  resetRideForm();

  closeModal();

  showRides();
}


// =========================================================
// ОЧИЩЕННЯ ФОРМИ
// =========================================================

function resetRideForm() {

  const name =
    document.getElementById(
      'rideName'
    );

  const date =
    document.getElementById(
      'rideDate'
    );

  const time =
    document.getElementById(
      'rideTime'
    );

  const people =
    document.getElementById(
      'ridePeople'
    );

  const status =
    document.getElementById(
      'locationStatus'
    );

  if (name) {

    name.value =
      '';
  }

  if (date) {

    date.value =
      '';
  }

  if (time) {

    time.value =
      '';
  }

  if (people) {

    people.value =
      '10';
  }

  meetingLocation =
    null;

  if (meetingMarker) {

    map.removeLayer(
      meetingMarker
    );

    meetingMarker =
      null;
  }

  if (status) {

    status.textContent =
      '📍 Точку збору ще не вибрано';
  }
}
// =========================================================
// СПІЛЬНОТА
// =========================================================

function showCommunity() {

  hideAllSections();

  showBackButton();

  const mapElement =
    document.getElementById('map');

  const profile =
    document.getElementById('profile');

  if (mapElement) {

    mapElement.style.display =
      'none';
  }

  if (profile) {

    profile.style.display =
      'block';

    profile.innerHTML = `

      <div class="ride-card">

        <h2>
          👥 Спільнота
        </h2>

        <div class="ride-info">

          Тут буде спільнота
          мотоциклістів Moto Maps.

          <br><br>

          🏍️ Мотоциклісти<br>
          🏁 Мотопоїздки<br>
          💬 Спілкування<br>
          📍 Люди поруч

        </div>

      </div>

    `;
  }

  setActiveNavigation(1);
}


// =========================================================
// СПИСОК МОТОПОЇЗДОК
// =========================================================

function showRides() {

  showBackButton();

  hideAllSections();

  const mapElement =
    document.getElementById('map');

  const rideList =
    document.getElementById('rideList');

  if (mapElement) {

    mapElement.style.display =
      'block';
  }

  if (rideList) {

    rideList.style.display =
      'block';
  }

  if (!rideList) {

    return;
  }

  const rides =
    getRides();

  if (rides.length === 0) {

    rideList.innerHTML = `

      <div class="ride-card">

        <h3>
          🏍️ Мотопоїздок поки немає
        </h3>

        <div class="ride-info">

          Створи першу мотопоїздку
          за допомогою кнопки
          «ПОЇХАЛИ».

        </div>

      </div>

    `;

    createAllRideMarkers();

    return;
  }

  rideList.innerHTML =
    '';

  rides
    .slice()
    .reverse()
    .forEach(
      function(ride) {

        const card =
          document.createElement(
            'div'
          );

        card.className =
          'ride-card';

        card.innerHTML = `

          <h3>
            🏍️
            ${escapeHtml(
              ride.name
            )}
          </h3>

          <div class="ride-info">

            📅
            ${escapeHtml(
              ride.date
            )}

            <br>

            🕐
            ${escapeHtml(
              ride.time
            )}

            <br>

            👥 До
            ${escapeHtml(
              ride.people
            )}
            учасників

            <br>

            📍 Точку збору вибрано

          </div>

          <div class="ride-actions">

            <button
              type="button"
              onclick="openRideOnMap(${ride.id})"
            >
              🗺️ На карті
            </button>

            <button
              type="button"
              onclick="joinRide(${ride.id})"
            >
              🏍️ Приєднатися
            </button>

          </div>

        `;

        rideList.appendChild(
          card
        );
      }
    );

  createAllRideMarkers();
}


// =========================================================
// МАРКЕРИ МОТОПОЇЗДОК
// =========================================================

function createAllRideMarkers() {

  rideMarkers.forEach(
    function(item) {

      if (item.marker) {

        map.removeLayer(
          item.marker
        );
      }
    }
  );

  rideMarkers =
    [];

  const rides =
    getRides();

  rides.forEach(
    function(ride) {

      if (
        typeof ride.lat !== 'number' ||
        typeof ride.lng !== 'number'
      ) {

        return;
      }

      const marker =
        L.marker([
          ride.lat,
          ride.lng
        ])
          .addTo(map)
          .bindPopup(`

            <div>

              🏍️ <b>
                ${escapeHtml(
                  ride.name
                )}
              </b>

              <br><br>

              📅
              ${escapeHtml(
                ride.date
              )}

              <br>

              🕐
              ${escapeHtml(
                ride.time
              )}

              <br>

              👥 До
              ${escapeHtml(
                ride.people
              )}
              учасників

            </div>

          `);

      rideMarkers.push({

        id:
          ride.id,

        marker:
          marker

      });
    }
  );
}


// =========================================================
// ВІДКРИТИ МОТОПОЇЗДКУ НА КАРТІ
// =========================================================

function openRideOnMap(
  rideId
) {

  const rides =
    getRides();

  const ride =
    rides.find(
      function(item) {

        return Number(
          item.id
        ) === Number(
          rideId
        );
      }
    );

  if (!ride) {

    return;
  }

  showMap();

  map.setView(
    [
      ride.lat,
      ride.lng
    ],
    14
  );

  createAllRideMarkers();

  const item =
    rideMarkers.find(
      function(entry) {

        return Number(
          entry.id
        ) === Number(
          rideId
        );
      }
    );

  if (item) {

    item.marker.openPopup();
  }
}


// =========================================================
// ПОКАЗ КАРТИ
// =========================================================

function showMap() {

  hideAllSections();

  hideBackButton();

  const mapElement =
    document.getElementById('map');

  const rideList =
    document.getElementById('rideList');

  if (mapElement) {

    mapElement.style.display =
      'block';
  }

  if (rideList) {

    rideList.style.display =
      'none';
  }

  setTimeout(
    function() {

      map.invalidateSize();

      createAllRideMarkers();

    },
    100
  );

  setActiveNavigation(
    0
  );
}


// =========================================================
// ЧАТ
// =========================================================

function getChatMessages() {

  const saved =
    localStorage.getItem(
      'motoChat'
    );

  if (!saved) {

    return [];
  }

  try {

    const messages =
      JSON.parse(saved);

    return Array.isArray(
      messages
    )
      ? messages
      : [];

  } catch (error) {

    return [];
  }
}


function saveChatMessages(
  messages
) {

  localStorage.setItem(
    'motoChat',
    JSON.stringify(
      messages
    )
  );
}


function showChat() {

  hideAllSections();

  showBackButton();

  const chat =
    document.getElementById(
      'chat'
    );

  if (!chat) {

    return;
  }

  chat.style.display =
    'block';

  renderChat();

  setActiveNavigation(
    3
  );
}


function renderChat() {

  const chat =
    document.getElementById(
      'chat'
    );

  if (!chat) {

    return;
  }

  const messages =
    getChatMessages();

  let messagesHtml =
    '';

  if (
    messages.length === 0
  ) {

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

          ${messages
            .map(
              function(message) {

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
              }
            )
            .join('')}

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


function sendMessage(
  event
) {

  event.preventDefault();

  const input =
    document.getElementById(
      'chatInput'
    );

  if (!input) {

    return;
  }

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

    id:
      Date.now(),

    author:
      profile.nickname ||
      'Moto Rider',

    text:
      text,

    time:
      new Date()
        .toLocaleString(
          'uk-UA'
        )
  });

  saveChatMessages(
    messages
  );

  renderChat();
}
// =========================================================
// ПРОФІЛЬ
// =========================================================

function getProfile() {

  const saved =
    localStorage.getItem(
      'motoProfile'
    );

  const defaultProfile = {

    nickname:
      'Moto Rider',

    bike:
      'Поки не вказано',

    city:
      'Поки не вказано',

    about:
      'Не заповнено'
  };

  if (!saved) {

    return defaultProfile;
  }

  try {

    return {

      ...defaultProfile,

      ...JSON.parse(
        saved
      )
    };

  } catch (error) {

    return defaultProfile;
  }
}


function showProfile() {

  hideAllSections();

  showBackButton();

  const profile =
    document.getElementById(
      'profile'
    );

  if (!profile) {

    return;
  }

  profile.style.display =
    'block';

  renderProfile();

  setActiveNavigation(
    4
  );
}


function renderProfile() {

  const profileElement =
    document.getElementById(
      'profile'
    );

  if (!profileElement) {

    return;
  }

  const profile =
    getProfile();

  const rides =
    getRides();

  profileElement.innerHTML = `

    <div class="ride-card">

      <h2>
        👤 Мій профіль
      </h2>

      <br>

      <p>
        🏍️ <b>Нік:</b>
        ${escapeHtml(
          profile.nickname
        )}
      </p>

      <br>

      <p>
        🏍️ <b>Мотоцикл:</b>
        ${escapeHtml(
          profile.bike
        )}
      </p>

      <br>

      <p>
        📍 <b>Місто:</b>
        ${escapeHtml(
          profile.city
        )}
      </p>

      <br>

      <p>
        📝 <b>Про себе:</b>
      </p>

      <p class="profile-about">

        ${escapeHtml(
          profile.about
        )}

      </p>

      <br>

      <p>
        🏁 <b>
          Створено мотопоїздок:
        </b>

        ${rides.length}

      </p>

      <br>

      <button
        class="create-btn"
        type="button"
        onclick="editProfile()"
      >
        ✏️ Редагувати профіль
      </button>

      <button
        class="secondary-btn"
        type="button"
        onclick="showRegistration()"
      >
        👤 Реєстрація / новий користувач
      </button>

    </div>

  `;
}


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

      nickname:
        nickname,

      bike:
        bike ||
        'Не вказано',

      city:
        city ||
        'Не вказано',

      about:
        about ||
        'Не заповнено'
    })
  );

  renderProfile();
}


// =========================================================
// РЕЄСТРАЦІЯ
// =========================================================

function showRegistration() {

  hideAllSections();

  showBackButton();

  const profile =
    document.getElementById(
      'profile'
    );

  if (!profile) {

    return;
  }

  profile.style.display =
    'block';

  profile.innerHTML = `

    <div class="ride-card auth-card">

      <h2>
        👤 Реєстрація Moto Maps
      </h2>

      <p class="ride-info">

        Створи обліковий запис Moto Maps.
        Дані будуть збережені
        у спільній базі.

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
        type="button"
        onclick="registerUser()"
      >
        👤 Зареєструватися
      </button>

      <button
        class="cancel-btn"
        type="button"
        onclick="showProfile()"
      >
        Назад до профілю
      </button>

    </div>

  `;
}


async function registerUser() {

  if (!supabaseClient) {

    alert(
      'Supabase недоступний. Перевірте підключення.'
    );

    return;
  }

  const email =
    document.getElementById(
      'regEmail'
    ).value.trim();

  const password =
    document.getElementById(
      'regPassword'
    ).value;

  const nickname =
    document.getElementById(
      'regNickname'
    ).value.trim();

  const bike =
    document.getElementById(
      'regBike'
    ).value.trim();

  const city =
    document.getElementById(
      'regCity'
    ).value.trim();

  const about =
    document.getElementById(
      'regAbout'
    ).value.trim();

  if (!email) {

    alert(
      'Введіть email.'
    );

    return;
  }

  if (password.length < 6) {

    alert(
      'Пароль повинен містити щонайменше 6 символів.'
    );

    return;
  }

  if (!nickname) {

    alert(
      'Введіть нік.'
    );

    return;
  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .auth
        .signUp({

          email:
            email,

          password:
            password
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

    const {
      error:
        profileError
    } =
      await supabaseClient
        .from('profiles')
        .insert({

          id:
            userId,

          nickname:
            nickname,

          city:
            city ||
            null,

          about:
            about ||
            null
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

    if (bike) {

      const {
        error:
          motorcycleError
      } =
        await supabaseClient
          .from('motorcycles')
          .insert({

            user_id:
              userId,

            brand:
              bike,

            model:
              'Не вказано'
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

    localStorage.setItem(
      'motoProfile',
      JSON.stringify({

        id:
          userId,

        nickname:
          nickname,

        bike:
          bike ||
          'Не вказано',

        city:
          city ||
          'Не вказано',

        about:
          about ||
          'Не заповнено',

        email:
          email
      })
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
// =========================================================

function joinRide(
  rideId
) {

  const ride =
    getRides().find(
      function(item) {

        return Number(
          item.id
        ) === Number(
          rideId
        );
      }
    );

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
// ПРИХОВУВАННЯ СЕКЦІЙ
// =========================================================

function hideAllSections() {

  const rideList =
    document.getElementById(
      'rideList'
    );

  const chat =
    document.getElementById(
      'chat'
    );

  const profile =
    document.getElementById(
      'profile'
    );

  if (rideList) {

    rideList.style.display =
      'none';
  }

  if (chat) {

    chat.style.display =
      'none';
  }

  if (profile) {

    profile.style.display =
      'none';
  }
}


// =========================================================
// НИЖНЯ НАВІГАЦІЯ
// =========================================================

function setActiveNavigation(
  index
) {

  const items =
    document.querySelectorAll(
      'nav > .nav-item'
    );

  items.forEach(
    function(
      item,
      itemIndex
    ) {

      if (
        itemIndex === index
      ) {

        item.classList.add(
          'active'
        );

      } else {

        item.classList.remove(
          'active'
        );
      }
    }
  );
}


// =========================================================
// БЕЗПЕЧНЕ ВИВЕДЕННЯ HTML
// =========================================================

function escapeHtml(
  value
) {

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
// КНОПКА «НАЗАД»
// =========================================================

function showBackButton() {

  const button =
    document.getElementById(
      'backButton'
    );

  if (button) {

    button.style.display =
      'block';
  }
}


function hideBackButton() {

  const button =
    document.getElementById(
      'backButton'
    );

  if (button) {

    button.style.display =
      'none';
  }
}


function goBack() {

  showMap();

  hideBackButton();
}
// =========================================================
// ПОГОДА
// =========================================================

let weatherData = null;


// =========================================================
// ВІДКРИТТЯ ПОГОДИ
// =========================================================

function openWeather() {

  const modal =
    document.getElementById(
      'weatherModal'
    );

  if (modal) {

    modal.style.display =
      'flex';
  }

  loadWeather();
}


// =========================================================
// ЗАКРИТТЯ ПОГОДИ
// =========================================================

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


// =========================================================
// ЗАКРИТТЯ ПОГОДИ ПРИ НАТИСКАННІ ПОЗА ВІКНОМ
// =========================================================

document.addEventListener(
  'click',
  function(event) {

    const modal =
      document.getElementById(
        'weatherModal'
      );

    const content =
      document.querySelector(
        '.weather-modal-content'
      );

    if (
      modal &&
      content &&
      event.target === modal
    ) {

      closeWeather();
    }
  }
);


// =========================================================
// ВИЗНАЧЕННЯ ГЕОЛОКАЦІЇ ТА ЗАВАНТАЖЕННЯ ПОГОДИ
// =========================================================

function loadWeather() {

  if (!navigator.geolocation) {

    showWeatherError(
      'Геолокація не підтримується браузером.'
    );

    return;
  }

  navigator.geolocation.getCurrentPosition(

    function(position) {

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      getWeather(
        latitude,
        longitude
      );
    },

    function(error) {

      console.error(
        'Помилка геолокації:',
        error
      );

      showWeatherError(
        'Дозвольте доступ до геолокації.'
      );
    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}


// =========================================================
// ОТРИМАННЯ ПОГОДИ
// =========================================================

async function getWeather(
  latitude,
  longitude
) {

  try {

    const weatherUrl =
      'https://api.open-meteo.com/v1/forecast' +

      '?latitude=' +
      encodeURIComponent(
        latitude
      ) +

      '&longitude=' +
      encodeURIComponent(
        longitude
      ) +

      '&current=' +
      encodeURIComponent(
        'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,surface_pressure'
      ) +

      '&hourly=' +
      encodeURIComponent(
        'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure,is_day'
      ) +

      '&daily=' +
      encodeURIComponent(
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max'
      ) +

      '&forecast_days=3' +

      '&timezone=auto' +

      '&wind_speed_unit=ms';


    const response =
      await fetch(
        weatherUrl
      );


    if (!response.ok) {

      throw new Error(
        'Не вдалося отримати дані погоди.'
      );
    }


    const data =
      await response.json();


    weatherData =
      data;


    let locationName =
      'Ваше місцезнаходження';


    // Визначення назви населеного пункту
    try {

      const locationResponse =
        await fetch(
          'https://api.bigdatacloud.net/data/reverse-geocode-client' +
          '?latitude=' +
          encodeURIComponent(
            latitude
          ) +
          '&longitude=' +
          encodeURIComponent(
            longitude
          ) +
          '&localityLanguage=uk'
        );


      if (
        locationResponse.ok
      ) {

        const locationData =
          await locationResponse.json();


        locationName =
          locationData.city ||
          locationData.locality ||
          locationData.principalSubdivision ||
          'Ваше місцезнаходження';
      }

    } catch (locationError) {

      console.warn(
        'Не вдалося визначити назву міста:',
        locationError
      );
    }


    updateWeatherInterface(
      data,
      locationName
    );


  } catch (error) {

    console.error(
      'Помилка завантаження погоди:',
      error
    );

    showWeatherError(
      'Не вдалося завантажити погоду.'
    );
  }
}


// =========================================================
// ОНОВЛЕННЯ ІНТЕРФЕЙСУ ПОГОДИ
// =========================================================

function updateWeatherInterface(
  data,
  locationName
) {

  const current =
    data.current;


  const weatherInfo =
    getWeatherDescription(
      current.weather_code,
      current.is_day
    );


  // Кнопка на карті

  const buttonIcon =
    document.getElementById(
      'weatherButtonIcon'
    );

  const buttonTemperature =
    document.getElementById(
      'weatherButtonTemperature'
    );


  if (buttonIcon) {

    buttonIcon.textContent =
      weatherInfo.icon;
  }


  if (buttonTemperature) {

    buttonTemperature.textContent =
      Math.round(
        current.temperature_2m
      ) +
      '°C';
  }


  // Назва місця

  const modalLocation =
    document.getElementById(
      'weatherModalLocation'
    );


  if (modalLocation) {

    modalLocation.textContent =
      '📍 ' +
      locationName;
  }


  // Поточна температура

  const currentTemperature =
    document.getElementById(
      'weatherCurrentTemperature'
    );


  if (currentTemperature) {

    currentTemperature.textContent =
      Math.round(
        current.temperature_2m
      ) +
      '°C';
  }


  // Іконка

  const currentIcon =
    document.getElementById(
      'weatherCurrentIcon'
    );


  if (currentIcon) {

    currentIcon.textContent =
      weatherInfo.icon;
  }


  // Опис

  const currentDescription =
    document.getElementById(
      'weatherCurrentDescription'
    );


  if (currentDescription) {

    currentDescription.textContent =
      weatherInfo.description;
  }


  // Вітер

  const currentWind =
    document.getElementById(
      'weatherCurrentWind'
    );


  if (currentWind) {

    currentWind.textContent =
      Math.round(
        current.wind_speed_10m
      ) +
      ' м/с';
  }


  // Тиск

  const currentPressure =
    document.getElementById(
      'weatherCurrentPressure'
    );


  if (currentPressure) {

    currentPressure.textContent =
      Math.round(
        current.surface_pressure
      ) +
      ' гПа';
  }


  // Вологість

  const currentHumidity =
    document.getElementById(
      'weatherCurrentHumidity'
    );


  if (currentHumidity) {

    currentHumidity.textContent =
      Math.round(
        current.relative_humidity_2m
      ) +
      '%';
  }


  renderTodayWeather(
    data
  );


  renderForecast(
    data
  );
}


// =========================================================
// ОПИС ПОГОДИ
// =========================================================

function getWeatherDescription(
  code,
  isDay
) {

  if (
    code === 0
  ) {

    return {

      icon:
        isDay
          ? '☀️'
          : '🌙',

      description:
        isDay
          ? 'Ясно'
          : 'Ясна ніч'
    };
  }


  if (
    code === 1 ||
    code === 2
  ) {

    return {

      icon:
        isDay
          ? '🌤️'
          : '☁️',

      description:
        'Мінлива хмарність'
    };
  }


  if (
    code === 3
  ) {

    return {

      icon:
        '☁️',

      description:
        'Хмарно'
    };
  }


  if (
    code >= 51 &&
    code <= 67
  ) {

    return {

      icon:
        '🌧️',

      description:
        'Дощ'
    };
  }


  if (
    code >= 71 &&
    code <= 77
  ) {

    return {

      icon:
        '🌨️',

      description:
        'Сніг'
    };
  }


  if (
    code >= 80 &&
    code <= 82
  ) {

    return {

      icon:
        '🌦️',

      description:
        'Зливи'
    };
  }


  if (
    code >= 95
  ) {

    return {

      icon:
        '⛈️',

      description:
        'Гроза'
    };
  }


  return {

    icon:
      '🌤️',

    description:
      'Змішана погода'
  };
}


// =========================================================
// ПОГОДА НА СЬОГОДНІ
// =========================================================

function renderTodayWeather(
  data
) {

  const container =
    document.getElementById(
      'weatherToday'
    );


  if (
    !container ||
    !data.hourly
  ) {

    return;
  }


  const hourly =
    data.hourly;

  const times =
    hourly.time;

  const now =
    new Date();

  let html =
    '';


  for (
    let i = 0;
    i < times.length;
    i++
  ) {

    const itemTime =
      new Date(
        times[i]
      );


    if (
      itemTime.getDate() !==
      now.getDate()
    ) {

      continue;
    }


    const hour =
      itemTime
        .getHours()
        .toString()
        .padStart(
          2,
          '0'
        );


    const weather =
      getWeatherDescription(
        hourly.weather_code[i],
        hourly.is_day[i]
      );


    html += `

      <div class="weather-forecast-card">

        <small>
          ${hour}:00
        </small>

        <div>
          ${weather.icon}
        </div>

        <strong>
          ${Math.round(
            hourly.temperature_2m[i]
          )}°
        </strong>

      </div>

    `;
  }


  container.innerHTML =
    html ||
    'Дані погодинного прогнозу недоступні.';
}


// =========================================================
// ПРОГНОЗ НА 3 ДНІ
// =========================================================

function renderForecast(
  data
) {

  const container =
    document.getElementById(
      'weatherForecast'
    );


  if (
    !container ||
    !data.daily
  ) {

    return;
  }


  const daily =
    data.daily;

  let html =
    '';


  for (
    let i = 0;
    i < daily.time.length;
    i++
  ) {

    const date =
      new Date(
        daily.time[i] +
        'T12:00:00'
      );


    const dayName =
      date.toLocaleDateString(
        'uk-UA',
        {
          weekday:
            'short',

          day:
            'numeric',

          month:
            'short'
        }
      );


    const weather =
      getWeatherDescription(
        daily.weather_code[i],
        1
      );


    html += `

      <div class="weather-forecast-card">

        <small>
          ${dayName}
        </small>

        <div>
          ${weather.icon}
        </div>

        <strong>

          ${Math.round(
            daily.temperature_2m_max[i]
          )}°

          /

          ${Math.round(
            daily.temperature_2m_min[i]
          )}°

        </strong>

        <small>

          💧
          ${daily.precipitation_probability_max[i] ?? 0}%

        </small>

        <small>

          💨
          ${Math.round(
            daily.wind_speed_10m_max[i]
          )}
          м/с

        </small>

      </div>

    `;
  }


  container.innerHTML =
    html;
}


// =========================================================
// ПОМИЛКА ПОГОДИ
// =========================================================

function showWeatherError(
  message
) {

  const location =
    document.getElementById(
      'weatherModalLocation'
    );


  if (location) {

    location.textContent =
      '📍 ' +
      message;
  }
}


// =========================================================
// ЗАПУСК ЗАСТОСУНКУ
// =========================================================

window.addEventListener(
  'load',
  function() {

    console.log(
      '🏍️ Moto Maps запущено'
    );

    loadWeather();

    getRides();

    createAllRideMarkers();

    renderProfile();

    setActiveNavigation(
      0
    );

    setTimeout(
      function() {

        map.invalidateSize();

        createAllRideMarkers();

      },
      300
    );
  }
);