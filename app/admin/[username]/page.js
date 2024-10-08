// app/admin/[username]/page.js

'use client';

import DeleteButton from '@/components/DeleteButton';
import EditButton from '@/components/EditButton';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { parseISO, format, subWeeks, startOfDay } from 'date-fns';
import Pagination from 'rc-pagination';
import {
  calculateHoursWorked,
  calculateMinutesWorked,
} from '@/utils/dateUtils';

const UserDetailPage = ({ params }) => {
  const username = decodeURIComponent(params.username);
  const [timesheets, setTimesheets] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalHours, setTotalHours] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20; // Limit of timesheets per page

  const fetchTimesheets = async (page) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/timesheets/${username}?page=${page}&limit=${limit}`
      );
      const data = await res.json();
      setTimesheets(data.timesheets);
      setTotalPages(Math.ceil(data.totalCount / limit));
      setTotalHours(data.totalHours);
      setTotalMinutes(data.totalMinutes);
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheets(page);
  }, [page, username]);

  // Function to format the date
  const formatDate = (dateString) => {
    const date =
      typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'dd MMM yy EE'); // Format as "01 Aug 24 Thu"
  };

  // Function to format hours and minutes for display
  const formatTime = (hours, minutes) => {
    return minutes === 0
      ? `${parseInt(hours)} hrs`
      : `${parseInt(hours)} hrs ${parseInt(minutes)} mins`;
  };

  // // Calculate total hours and minutes for the displayed timesheets
  // const totalMinutes = timesheets.reduce((acc, timesheet) => {
  //   return acc + calculateMinutesWorked(timesheet.start, timesheet.end);
  // }, 0);

  // const { hours, minutes } = convertMinutesToHours(totalMinutes);

  return (
    <main className='p-4 sm:p-8'>
      <div className='flex justify-end gap-2 mb-4'>
        <Link
          href={`/api/export-timesheets/${username}`}
          className='px-3 py-1 bg-slate-700 hover:bg-slate-900 text-white rounded text-xs sm:text-sm'
        >
          Export Details
        </Link>
        <Link
          href='../admin'
          className='px-3 py-1 bg-slate-700 hover:bg-slate-900 text-white rounded text-xs sm:text-sm'
        >
          Go Back
        </Link>
      </div>
      <h1 className='text-md sm:text-lg font-semibold mb-4 text-lime-800 hover:text-emerald-950 text-center sm:text-left'>
        {`${username}'s work.`}
      </h1>
      {loading ? (
        <div className='text-center'>Loading...</div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='min-w-full bg-white border border-gray-200'>
            <thead className='bg-gray-100'>
              <tr>
                <th className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'>
                  Date
                </th>
                <th className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'>
                  Start
                </th>
                <th className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'>
                  End
                </th>
                <th className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'>
                  Hours Worked
                </th>
                <th className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm font-semibold text-lime-800 hover:text-emerald-950'>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {timesheets.map((timesheet) => (
                <tr key={timesheet._id.toString()} className='hover:bg-gray-50'>
                  <td className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm text-slate-700 hover:text-emerald-900 font-semibold'>
                    {formatDate(timesheet.date)}
                  </td>
                  <td className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm text-slate-700 hover:text-emerald-900'>
                    {timesheet.start}
                  </td>
                  <td className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm text-slate-700 hover:text-emerald-900'>
                    {timesheet.end}
                  </td>
                  <td className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm text-slate-700 hover:text-emerald-900 font-bold'>
                    {formatTime(
                      Math.floor(
                        calculateHoursWorked(timesheet.start, timesheet.end)
                      ),
                      calculateMinutesWorked(timesheet.start, timesheet.end) %
                        60
                    )}
                  </td>
                  <td className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm text-lime-800 hover:text-emerald-950 flex gap-2'>
                    <EditButton id={timesheet._id.toString()} />
                    <DeleteButton id={timesheet._id.toString()} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td
                  className='border border-gray-300 px-2 py-1 text-left text-xs sm:text-sm text-slate-700 hover:text-emerald-900 font-extrabold'
                  colSpan='3'
                >
                  Total Hours (Last 4 Weeks)
                </td>
                <td
                  className='border border-gray-300 px-2 py-1 text-left text-slate-950 hover:text-emerald-900 font-extrabold text-xs sm:text-sm'
                  colSpan='2'
                >
                  {formatTime(totalHours, totalMinutes)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {/* Pagination Controls */}{' '}
      {timesheets.length > 0 && (
        <div className='mt-4 flex justify-center'>
          <Pagination
            current={page}
            total={totalPages * limit} // Total count of items (timesheets)
            pageSize={limit} // Items per page
            onChange={(page) => setPage(page)} // Update page state on change
            className='pagination'
          />
        </div>
      )}
    </main>
  );
};

export default UserDetailPage;
