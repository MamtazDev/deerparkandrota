//app/admin/page.js

export const metadata = {
  title: 'Admin page',
  description: 'Simple timesheet app for Deerpark staffs',
};

import connectMongo from '@/db/connectMongo';
import Timesheet from '@/models/Timesheet';
import {
  calculateMinutesWorked,
  convertMinutesToHours,
  formatDate,
  getLastFourWeeks,
  getPreviousWeek,
} from '@/utils/dateUtils';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

const AdminPage = async () => {
  const { isAuthenticated, getUser, getPermission } = getKindeServerSession();

  if (!(await isAuthenticated())) {
    // redirect('/api/auth/login?post_login_redirect_url=/admin');
    redirect('/');
  }

  const requiredPermission = await getPermission('delete:timesheet');
  if (!requiredPermission?.isGranted) {
    redirect('/timesheet');
  }

  await getUser();
  await connectMongo();

  const timesheets = await Timesheet.find({}).sort({ date: 1 });

  const lastFourWeeks = getLastFourWeeks();
  const previousWeek = getPreviousWeek(new Date());

  const dateRanges = [previousWeek, ...lastFourWeeks];
  const uniqueDateRanges = Array.from(
    new Set(dateRanges.map((range) => JSON.stringify(range)))
  ).map((range) => JSON.parse(range));

  uniqueDateRanges.sort((a, b) => new Date(b.start) - new Date(a.start));

  const usersTimesheets = timesheets.reduce((acc, timesheet) => {
    const { username, date, start, end } = timesheet;
    const timesheetDate = new Date(date).toISOString().split('T')[0];
    const minutesWorked = calculateMinutesWorked(start, end);

    if (!acc[username]) {
      acc[username] = { username, periods: {}, totalMinutes: 0 };
    }

    uniqueDateRanges.forEach((range) => {
      const rangeStart = new Date(range.start).toISOString().split('T')[0];
      const rangeEnd = new Date(range.end).toISOString().split('T')[0];

      const periodStart = new Date(rangeStart);
      const periodEnd = new Date(rangeEnd);

      if (
        new Date(timesheetDate) >= periodStart &&
        new Date(timesheetDate) <= periodEnd
      ) {
        const periodKey = `${formatDate(new Date(range.start))} - ${formatDate(
          new Date(range.end)
        )}`;
        acc[username].periods[periodKey] =
          (acc[username].periods[periodKey] || 0) + minutesWorked; // Keep minutes for accurate display
        acc[username].totalMinutes += minutesWorked;
      }
    });

    return acc;
  }, {});
  console.log('Users Timesheets:', usersTimesheets);
  console.log('Unique Date Ranges:', uniqueDateRanges);

  // Convert total minutes to hours and minutes for each user
  Object.values(usersTimesheets).forEach((user) => {
    const { hours, minutes } = convertMinutesToHours(user.totalMinutes);
    user.totalHours = Math.floor(hours); // Rounding hours to integer
    user.totalMinutes = Math.round(minutes); // Rounding minutes to integer
  });
  console.log('Final Data for Table:', Object.values(usersTimesheets));

  // Function to format hours and minutes based on conditions
  const formatTime = (hours, minutes) => {
    if (hours === 0 && minutes === 0) {
      return `0 mins`;
    } else if (minutes === 0) {
      return `${hours} hrs`;
    } else if (hours === 0) {
      return `${minutes} mins`;
    } else {
      return `${hours} hrs ${minutes} mins`;
    }
  };

  return (
    <main className='p-4 sm:p-8'>
      <div className='flex justify-end gap-3 mb-4'>
        <Link
          href='../rota'
          className='px-4 py-2 bg-slate-700 hover:bg-slate-900 text-white rounded text-xs sm:text-sm'
        >
          Go to Rota page
        </Link>
        <Link
          // href='/api/generate-timesheet?type=summary'
          href='/api/generate-timesheet/list'
          className='px-4 py-2 bg-slate-700 hover:bg-slate-900 text-white rounded text-xs sm:text-sm'
        >
          Export to Excel
        </Link>
      </div>
      <h1 className='text-md sm:text-lg font-semibold mb-4 text-lime-800 hover:text-emerald-950 text-center sm:text-left'>
        Admin Area
      </h1>

      <div className='overflow-x-auto'>
        <table className='min-w-full bg-white border border-gray-200'>
          <thead className='bg-gray-100'>
            <tr>
              <th className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'>
                Name
              </th>
              {uniqueDateRanges.map((range, index) => (
                <th
                  key={index}
                  className='border border-gray-300 px-1 py-0.5 text-center text-[10px] sm:text-xs md:text-sm font-semibold text-lime-800 hover:text-emerald-950'
                >
                  {`${formatDate(new Date(range.start))} - ${formatDate(
                    new Date(range.end)
                  )}`}
                </th>
              ))}
              <th className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'>
                Total (4 Weeks)
              </th>
              <th className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'>
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.values(usersTimesheets).map((user) => (
              <tr key={user.username} className='hover:bg-gray-50'>
                <td className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-900'>
                  {user.username || 'Unknown'}
                </td>
                {uniqueDateRanges.map((range, index) => {
                  const periodKey = `${formatDate(
                    new Date(range.start)
                  )} - ${formatDate(new Date(range.end))}`;
                  const periodMinutes = user.periods[periodKey] || 0;
                  const { hours, minutes } =
                    convertMinutesToHours(periodMinutes);

                  return (
                    <td
                      key={index}
                      className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm font-semibold text-slate-700 hover:text-emerald-900'
                    >
                      {formatTime(hours, minutes)}
                    </td>
                  );
                })}
                <td className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm font-bold text-slate-700 hover:text-emerald-900'>
                  {formatTime(user.totalHours, user.totalMinutes)}
                </td>
                <td className='border border-gray-300 px-2 py-1 text-center text-xs sm:text-sm'>
                  <Link
                    href={`/admin/${encodeURIComponent(user.username)}`}
                    className='text-emerald-700 hover:text-green-500 font-bold'
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default AdminPage;
