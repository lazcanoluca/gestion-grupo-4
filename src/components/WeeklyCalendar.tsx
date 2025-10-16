import React from 'react';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8:00 to 22:00

export const WeeklyCalendar: React.FC = () => {
    return (
        <div className="h-full overflow-auto bg-white">
            {/* Single grid containing EVERYTHING */}
            <div className="grid grid-cols-[60px_repeat(5,1fr)]" style={{ gridTemplateRows: 'auto repeat(15, 60px)' }}>
                {/* Header row - first row of the grid */}
                <div className="bg-gray-100 border-r border-b-2 border-gray-300"></div>
                {DAYS.map((day) => (
                    <div
                        key={day}
                        className="bg-gray-100 p-3 text-center font-semibold border-r border-b-2 border-gray-300 last:border-r-0"
                    >
                        {day}
                    </div>
                ))}

                {/* Time slots - all remaining rows */}
                {HOURS.map((hour) => (
                    <React.Fragment key={hour}>
                        {/* Time label */}
                        <div className="bg-gray-50 border-r border-b border-gray-300 p-2 text-sm font-medium text-gray-600 flex items-start justify-center">
                            {`${hour.toString().padStart(2, '0')}:00`}
                        </div>

                        {/* Day cells */}
                        {DAYS.map((day) => (
                            <div
                                key={`${day}-${hour}`}
                                className="border-r border-b border-gray-200 last:border-r-0 hover:bg-blue-50 transition-colors cursor-pointer"
                            ></div>
                        ))}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};
