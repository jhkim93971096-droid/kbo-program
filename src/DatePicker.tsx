import { useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

export function DatePicker({ date, label, onChange }: {
  date: string;
  label: string;
  onChange: (date: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [month, setMonth] = useState(date.slice(0, 7));
  const first = new Date(`${month}-01T00:00:00Z`);
  const next = new Date(first);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const days = (next.getTime() - first.getTime()) / 86_400_000;

  function moveMonth(offset: number) {
    const target = new Date(first);
    target.setUTCMonth(target.getUTCMonth() + offset);
    setMonth(target.toISOString().slice(0, 7));
  }

  function select(value: string) {
    onChange(value);
    dialog.current?.close();
  }

  return <>
    <button type="button" className="date-select" aria-haspopup="dialog" onClick={() => {
      setMonth(date.slice(0, 7));
      dialog.current?.showModal();
    }}><CalendarDays size={18}/><span>{label}</span></button>
    <dialog ref={dialog} className="calendar-dialog" aria-label="경기 날짜 선택">
      <div className="calendar-heading">
        <button type="button" className="date-nav" aria-label="이전 달" disabled={month === '0001-01'} onClick={() => moveMonth(-1)}><ChevronLeft size={18}/></button>
        <strong aria-live="polite">{new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(first)}</strong>
        <button type="button" className="date-nav" aria-label="다음 달" disabled={month === '9999-12'} onClick={() => moveMonth(1)}><ChevronRight size={18}/></button>
      </div>
      <div className="calendar-grid">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day}>{day}</span>)}
        {Array.from({ length: first.getUTCDay() }, (_, index) => <span key={`blank-${index}`} aria-hidden="true"/>)}
        {Array.from({ length: days }, (_, index) => {
          const value = `${month}-${String(index + 1).padStart(2, '0')}`;
          return <button key={value} type="button" aria-label={value} aria-pressed={value === date} onClick={() => select(value)}>{index + 1}</button>;
        })}
      </div>
      <form className="calendar-heading calendar-entry" onSubmit={(event) => {
        event.preventDefault();
        select(String(new FormData(event.currentTarget).get('date')));
      }}>
        <input key={date} name="date" type="date" aria-label="날짜 직접 입력" defaultValue={date} min="0001-01-01" max="9999-12-31" required/>
        <button className="today-button">이동</button>
        <button type="button" className="today-button" onClick={() => dialog.current?.close()}>닫기</button>
      </form>
    </dialog>
  </>;
}
