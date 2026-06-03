import React, { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, CheckCircle2, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const storageKey = 'todo-outlook-planner-tasks';
const statusOptions = ['未着手', '進行中', '確認待ち', '完了'];
const defaultTasks = [
  {
    id: crypto.randomUUID(),
    name: '週次レポートの下書きを作る',
    dueDate: getRelativeDate(1),
    status: '進行中',
    issue: '最新の売上データを確認する必要あり',
    calendar: true,
  },
  {
    id: crypto.randomUUID(),
    name: '顧客Aへのフォローアップ',
    dueDate: getRelativeDate(2),
    status: '未着手',
    issue: '30分の打ち合わせ枠を確保',
    calendar: true,
  },
  {
    id: crypto.randomUUID(),
    name: '完了済み資料の共有',
    dueDate: getRelativeDate(0),
    status: '完了',
    issue: '共有先を最終確認',
    calendar: false,
  },
];

function getRelativeDate(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function buildOutlookUrl(task) {
  const calendarDate = task.dueDate || getRelativeDate(1);
  const start = new Date(`${calendarDate}T09:00:00`);
  const end = new Date(`${calendarDate}T10:00:00`);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: task.name,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: `進捗状況: ${task.status}\n課題: ${task.issue || 'なし'}`,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function App() {
  const [tasks, setTasks] = useState(() => {
    const savedTasks = window.localStorage.getItem(storageKey);
    return savedTasks ? JSON.parse(savedTasks) : defaultTasks;
  });
  const [newTask, setNewTask] = useState({
    name: '',
    dueDate: getRelativeDate(1),
    status: '未着手',
    issue: '',
    calendar: false,
  });

  const tomorrow = getRelativeDate(1);
  const tomorrowTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.dueDate && task.dueDate <= tomorrow && task.status !== '完了')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [tasks, tomorrow],
  );

  const calendarTasks = useMemo(
    () => tasks.filter((task) => task.calendar && task.status !== '完了'),
    [tasks],
  );

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (event) => {
    event.preventDefault();
    if (!newTask.name.trim()) return;
    setTasks((current) => [
      ...current,
      { ...newTask, id: crypto.randomUUID(), name: newTask.name.trim() },
    ]);
    setNewTask({
      name: '',
      dueDate: getRelativeDate(1),
      status: '未着手',
      issue: '',
      calendar: false,
    });
  };

  const updateTask = (id, field, value) => {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, [field]: value } : task)),
    );
  };

  const deleteTask = (id) => {
    setTasks((current) => current.filter((task) => task.id !== id));
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Todo × Outlook Planner</p>
          <h1>明日やることとOutlook登録予定を、自動で組み立てるタスク表</h1>
          <p className="hero-copy">
            「タスク名」「納期」「進捗状況」「課題」を入力すると、明日対応すべき項目と
            カレンダー登録すべき予定が右側にまとまります。
          </p>
        </div>
        <div className="hero-card">
          <ClipboardList aria-hidden="true" />
          <strong>{tasks.length}</strong>
          <span>登録タスク</span>
        </div>
      </section>

      <section className="layout-grid">
        <div className="panel task-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Task table</p>
              <h2>タスク表</h2>
            </div>
          </div>

          <form className="task-form" onSubmit={addTask}>
            <label>
              タスク名
              <input
                value={newTask.name}
                onChange={(event) => setNewTask({ ...newTask, name: event.target.value })}
                placeholder="例: 見積書を送付する"
              />
            </label>
            <label>
              納期
              <input
                type="date"
                value={newTask.dueDate}
                onChange={(event) => setNewTask({ ...newTask, dueDate: event.target.value })}
              />
            </label>
            <label>
              進捗状況
              <select
                value={newTask.status}
                onChange={(event) => setNewTask({ ...newTask, status: event.target.value })}
              >
                {statusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="wide-input">
              課題
              <input
                value={newTask.issue}
                onChange={(event) => setNewTask({ ...newTask, issue: event.target.value })}
                placeholder="例: 上長確認が必要"
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={newTask.calendar}
                onChange={(event) => setNewTask({ ...newTask, calendar: event.target.checked })}
              />
              Outlookに登録候補
            </label>
            <button type="submit" className="primary-button">
              <Plus size={18} /> 追加
            </button>
          </form>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>タスク名</th>
                  <th>納期</th>
                  <th>進捗状況</th>
                  <th>課題</th>
                  <th>Outlook</th>
                  <th aria-label="削除" />
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className={task.status === '完了' ? 'is-complete' : ''}>
                    <td>
                      <input
                        value={task.name}
                        onChange={(event) => updateTask(task.id, 'name', event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={task.dueDate}
                        onChange={(event) => updateTask(task.id, 'dueDate', event.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        value={task.status}
                        onChange={(event) => updateTask(task.id, 'status', event.target.value)}
                      >
                        {statusOptions.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={task.issue}
                        onChange={(event) => updateTask(task.id, 'issue', event.target.value)}
                      />
                    </td>
                    <td className="center-cell">
                      <input
                        type="checkbox"
                        checked={task.calendar}
                        onChange={(event) => updateTask(task.id, 'calendar', event.target.checked)}
                        aria-label={`${task.name}をOutlook登録候補にする`}
                      />
                    </td>
                    <td>
                      <button className="icon-button" onClick={() => deleteTask(task.id)} aria-label="削除">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="side-stack">
          <section className="panel summary-panel tomorrow-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Tomorrow</p>
                <h2>明日やること</h2>
              </div>
              <CheckCircle2 aria-hidden="true" />
            </div>
            {tomorrowTasks.length === 0 ? (
              <p className="empty-text">明日までに対応が必要な未完了タスクはありません。</p>
            ) : (
              <ol className="task-list">
                {tomorrowTasks.map((task) => (
                  <li key={task.id}>
                    <strong>{task.name}</strong>
                    <span>{task.dueDate} / {task.status}</span>
                    {task.issue && <small>課題: {task.issue}</small>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel summary-panel calendar-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Outlook</p>
                <h2>カレンダー登録候補</h2>
              </div>
              <CalendarPlus aria-hidden="true" />
            </div>
            {calendarTasks.length === 0 ? (
              <p className="empty-text">Outlookに登録する候補はありません。</p>
            ) : (
              <div className="calendar-list">
                {calendarTasks.map((task) => (
                  <a key={task.id} href={buildOutlookUrl(task)} target="_blank" rel="noreferrer">
                    <span>
                      <strong>{task.name}</strong>
                      <small>{task.dueDate} 09:00-10:00</small>
                    </span>
                    <CalendarPlus size={18} />
                  </a>
                ))}
              </div>
            )}
            <p className="hint">リンクを押すとOutlookの予定作成画面にタスク内容を引き継ぎます。</p>
          </section>
        </aside>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
