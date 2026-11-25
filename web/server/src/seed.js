const seedData = require("./seed-data.json");
const config = require("./config");
const {
  nowIso,
  addDaysIso,
  cnToday,
  addDaysToDate,
  shortDate,
  hashPassword,
  randomId,
} = require("./util");
const { buildTimeline, defaultStatusSub } = require("./orderLogic");

module.exports = function seed(db) {
  const now = nowIso();
  const today = cnToday();

  function insertProduct(product, index) {
    db.prepare(
      `INSERT OR IGNORE INTO products
        (id, title, price, deposit, rating, reviews, img, gallery, styles, badge, sizes,
         fit, model, merchant, includes, real, city, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '三亚', 'active', ?, ?, ?)`
    ).run(
      product.id,
      product.title,
      product.price,
      product.deposit,
      product.rating,
      product.reviews,
      product.img,
      JSON.stringify(product.gallery),
      JSON.stringify(product.styles),
      product.badge || "",
      JSON.stringify(product.sizes),
      product.fit,
      product.model,
      product.merchant,
      product.includes,
      JSON.stringify(product.real),
      index,
      now,
      now
    );

    const missingSku = db
      .prepare("SELECT COUNT(*) AS n FROM product_skus WHERE product_id = ?")
      .get(product.id).n;
    if (missingSku === 0) {
      const stockPlan = { S: 5, M: 4, L: 3 };
      product.sizes.forEach((size) => {
        const stock = stockPlan[size] ?? 3;
        db.prepare(
          `INSERT INTO product_skus (id, product_id, size, stock_total, stock_available)
           VALUES (?, ?, ?, ?, ?)`
        ).run(randomId("sku"), product.id, size, stock, stock);
      });
    }
  }

  function insertPhotographer(p, index) {
    db.prepare(
      `INSERT OR IGNORE INTO photographers
        (id, name, title, avatar, cover, rating, orders_count, price, tags, works, bio,
         package_title, package_desc, package_price, package_deposit, package_includes,
         status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`
    ).run(
      p.id,
      p.name,
      p.title,
      p.avatar,
      p.cover,
      p.rating,
      p.orders,
      p.price,
      JSON.stringify(p.tags),
      JSON.stringify(p.works),
      p.bio,
      p.package.title,
      p.package.desc,
      p.package.price,
      p.package.deposit,
      JSON.stringify(p.package.includes),
      index,
      now,
      now
    );
  }

  function insertMakeup(a, index) {
    db.prepare(
      `INSERT OR IGNORE INTO makeup_artists
        (id, name, title, avatar, description, tags, price, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`
    ).run(
      a.id,
      a.name,
      a.title,
      a.avatar,
      a.desc,
      JSON.stringify(a.tags),
      a.price,
      index,
      now,
      now
    );
  }

  function insertPost(p, index) {
    const created = new Date(Date.now() - (index === 0 ? 2 * 3600e3 : index === 1 ? 86400e3 : 3 * 86400e3)).toISOString();
    db.prepare(
      `INSERT OR IGNORE INTO posts
        (id, user_name, avatar, city, text, images, tags, product_id, likes, comments, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`
    ).run(
      p.id,
      p.user,
      p.avatar,
      p.city,
      p.text,
      JSON.stringify(p.images),
      JSON.stringify(p.tags),
      p.product,
      p.likes,
      p.comments,
      created,
      created
    );
  }

  function ensureUser(user) {
    const exists = db.prepare("SELECT id FROM users WHERE id = ?").get(user.id);
    if (!exists) {
      db.prepare(
        `INSERT INTO users
          (id, nickname, avatar, real_name, gender, height, weight, size, city, member_level,
           deposit_credit, address_name, address_phone, address_text, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
      ).run(
        user.id,
        user.nickname,
        user.avatar,
        user.realName || "",
        user.gender || "",
        user.height || null,
        user.weight || null,
        user.size || "M",
        user.city || "三亚",
        user.memberLevel || "旅行会员",
        user.depositCredit || 2000,
        user.addressName || "",
        user.addressPhone || "",
        user.addressText || "",
        now,
        now
      );
    }

    for (const identity of user.identities || []) {
      db.prepare(
        `INSERT OR IGNORE INTO identities
          (id, user_id, type, value, nickname, avatar, union_id, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, '', ?, ?)`
      ).run(
        randomId("idn"),
        user.id,
        identity.type,
        identity.value,
        identity.nickname || user.nickname,
        identity.avatar || user.avatar,
        now,
        now
      );
    }
  }

  function seedDemoOrders(user) {
    const orderCount = db.prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?").get(user.id).n;
    if (orderCount > 0) return;

    const address = {
      name: user.addressName,
      phone: user.addressPhone,
      text: user.addressText,
    };

    /* 已完成的历史租衣订单 */
    const completedStart = addDaysToDate(today, -12);
    const completedEnd = addDaysToDate(completedStart, 2);
    const completedCreated = addDaysIso(-15);
    const completedOrder = {
      id: "r0",
      orderNo: `YY${completedStart.replace(/-/g, "")}0032`,
      type: "rental",
      status: "completed",
      statusSub: "订单已完成，押金 ¥500 已原路退回",
      productId: "floral",
      title: "海边碎花度假裙",
      image: "floral-dress",
      dateText: `${shortDate(completedStart)} - ${shortDate(completedEnd)} · 3 天`,
      merchant: "小野旅拍礼服馆",
      paid: 639,
      deposit: 500,
      balance: 0,
      size: "S",
      days: 3,
      delivery: "pickup",
      insurance: 0,
      startDate: completedStart,
      endDate: completedEnd,
      createdAt: completedCreated,
      updatedAt: completedCreated,
    };

    /* 进行中的租衣订单 */
    const rentalStart = addDaysToDate(today, 3);
    const rentalEnd = addDaysToDate(rentalStart, 2);
    const rentalCreated = addDaysIso(-1);
    const rentalOrder = {
      id: "r1",
      orderNo: `YY${today.replace(/-/g, "")}0086`,
      type: "rental",
      status: "paid",
      statusSub: defaultStatusSub("rental", "paid", {
        startDate: rentalStart,
        endDate: rentalEnd,
        deposit: 500,
      }),
      productId: "white",
      title: "海风白色法式长裙",
      image: "white-dress",
      dateText: `${shortDate(rentalStart)} - ${shortDate(rentalEnd)} · 3 天`,
      merchant: "阿岚旅拍礼服馆",
      paid: 633,
      deposit: 500,
      balance: 0,
      size: "M",
      days: 3,
      delivery: "hotel",
      insurance: 1,
      startDate: rentalStart,
      endDate: rentalEnd,
      createdAt: rentalCreated,
      updatedAt: rentalCreated,
    };

    /* 待拍摄的摄影订单 */
    const slotDate = addDaysToDate(today, 4);
    const slot = `${shortDate(slotDate)} 15:00`;
    const photoCreated = addDaysIso(-1);
    const photoOrder = {
      id: "p1",
      orderNo: `YYP${today.replace(/-/g, "")}0012`,
      type: "photo",
      status: "confirmed",
      statusSub: defaultStatusSub("photo", "confirmed", { slot }),
      productId: null,
      photographerId: "alan",
      title: "阿岚 · 2 小时海岛跟拍",
      image: "white-dress",
      dateText: slot,
      merchant: "阿岚摄影工作室",
      paid: 269,
      deposit: 269,
      balance: 630,
      size: "",
      days: 0,
      delivery: "",
      insurance: 0,
      slot,
      startDate: slotDate,
      endDate: slotDate,
      createdAt: photoCreated,
      updatedAt: photoCreated,
    };

    const orders = [rentalOrder, photoOrder, completedOrder];
    for (const order of orders) {
      const timeline = buildTimeline(order.type, order.status, {
        startDate: order.startDate,
        endDate: order.endDate,
        slot: order.slot,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        deposit: order.deposit,
      });
      db.prepare(
        `INSERT INTO orders
          (id, order_no, user_id, type, status, status_sub, product_id, photographer_id,
           title, image, date_text, merchant, paid, deposit, balance, size, days, delivery,
           insurance, address_name, address_phone, address_text, timeline, slot, start_date,
           end_date, stock_released, admin_note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, '', ?, ?)`
      ).run(
        order.id,
        order.orderNo,
        user.id,
        order.type,
        order.status,
        order.statusSub,
        order.productId || null,
        order.photographerId || null,
        order.title,
        order.image,
        order.dateText,
        order.merchant,
        order.paid,
        order.deposit,
        order.balance,
        order.size,
        order.days,
        order.delivery,
        order.insurance,
        address.name,
        address.phone,
        address.text,
        JSON.stringify(timeline),
        order.slot || "",
        order.startDate,
        order.endDate,
        order.createdAt,
        order.updatedAt
      );
    }

    db.prepare(
      `INSERT INTO deposits (id, order_id, user_id, amount, status, refunded_amount, note, refunded_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomId("dep"),
      rentalOrder.id,
      user.id,
      rentalOrder.deposit,
      "held",
      0,
      "",
      null,
      rentalCreated,
      rentalCreated
    );

    db.prepare(
      `INSERT INTO deposits (id, order_id, user_id, amount, status, refunded_amount, note, refunded_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'refunded', ?, ?, ?, ?, ?)`
    ).run(
      randomId("dep"),
      completedOrder.id,
      user.id,
      completedOrder.deposit,
      completedOrder.deposit,
      "质检通过，原路退回",
      addDaysIso(-9),
      completedCreated,
      addDaysIso(-9)
    );
  }

  db.exec("BEGIN IMMEDIATE");
  try {
    seedData.products.forEach(insertProduct);
    seedData.photographers.forEach(insertPhotographer);
    seedData.makeupArtists.forEach(insertMakeup);
    seedData.posts.forEach(insertPost);

    ensureUser({
      id: "u_demo_lin",
      nickname: "林小鹿",
      avatar: "model-2",
      height: 168,
      weight: 50,
      size: "S",
      city: "三亚",
      addressName: "林小鹿",
      addressPhone: "13800000001",
      addressText: "三亚亚龙湾云汀度假酒店 · 前台代收",
      identities: [{ type: "phone", value: "13800000001" }],
    });

    ensureUser({
      id: "u_demo_ali",
      nickname: "阿梨",
      avatar: "model-3",
      height: 165,
      weight: 48,
      size: "S",
      city: "三亚",
      addressName: "阿梨",
      addressPhone: "13800000002",
      addressText: "三亚后海村白房子民宿",
      identities: [
        { type: "phone", value: "13800000002" },
        { type: "wechat", value: "wx-demo-2" },
      ],
    });

    ensureUser({
      id: "u_demo_wx",
      nickname: "小满",
      avatar: "model-1",
      height: 166,
      weight: 49,
      size: "M",
      city: "三亚",
      identities: [{ type: "wechat", value: "wx-demo-3" }],
    });

    seedDemoOrders({
      id: "u_demo_lin",
      addressName: "林小鹿",
      addressPhone: "13800000001",
      addressText: "三亚亚龙湾云汀度假酒店 · 前台代收",
    });

    db.prepare(
      `INSERT OR IGNORE INTO favorites (user_id, product_id, created_at)
       VALUES (?, 'white', ?), (?, 'floral', ?)`
    ).run("u_demo_lin", now, "u_demo_lin", now);

    const admin = db.prepare("SELECT id FROM admin_users WHERE username = ?").get(config.adminUsername);
    if (!admin) {
      db.prepare(
        `INSERT INTO admin_users (id, username, password_hash, name, role, status, created_at)
         VALUES (?, ?, ?, ?, 'super', 'active', ?)`
      ).run(
        randomId("adm"),
        config.adminUsername,
        hashPassword(config.adminPassword),
        "平台运营",
        now
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw error;
  }
};
