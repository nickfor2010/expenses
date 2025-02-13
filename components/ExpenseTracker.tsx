"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase, signOut, getCurrentUser } from "@/lib/supabase"
import ExpenseFormMobile from "@/components/ExpenseFormMobile"
import { format, startOfYear, startOfMonth } from "date-fns"
import ErrorBoundary from "@/components/ErrorBoundary"
import { useRouter } from "next/navigation"
import styles from "./ExpenseTracker.module.css"

export default function ExpenseTracker() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [timePeriod, setTimePeriod] = useState("all-time")
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/signin")
      } else {
        setUser(currentUser)
      }
    }
    checkUser()
  }, [router])

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      router.push("/signin")
    }
  }

  const {
    data: totalExpenses,
    isLoading: isTotalLoading,
    isError: isTotalError,
    error: totalError,
  } = useQuery({
    queryKey: ["totalExpenses", timePeriod],
    queryFn: async () => {
      let query = supabase.from("expenses").select("amount")
      
      const today = new Date()

      if (timePeriod === "this-year") {
        const startOfYearDate = format(startOfYear(today), "yyyy-MM-dd")
        query = query.gte("date", startOfYearDate)
      } else if (timePeriod === "this-month") {
        const startOfMonthDate = format(startOfMonth(today), "yyyy-MM-dd")
        query = query.gte("date", startOfMonthDate)
      }

      const { data, error } = await query
      if (error) throw error
      return data.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  })

  const {
    data: todayExpenses,
    isLoading: isTodayLoading,
    isError: isTodayError,
    error: todayError,
  } = useQuery({
    queryKey: ["todayExpenses"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd")
      const { data, error } = await supabase.from("expenses").select("amount").eq("date", today)
      if (error) throw error
      return data.reduce((sum, expense) => sum + (expense.amount || 0), 0)
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  })

  if (!user) {
    return (
      <div className={`${styles.card} ${styles.loader}`}>
        <div className={styles.words}>
          <span className={styles.word}>Loading</span>
          <span className={styles.word}>Loading</span>
          <span className={styles.word}>Loading</span>
          <span className={styles.word}>Loading</span>
          <span className={styles.word}>Loading</span>
        </div>
      </div>
    ) // or a loading spinner
  }

  return (
    <ErrorBoundary>
      <div className={styles.container}>
        <div className="max-w-md mx-auto p-4">
          <div className={`${styles.header} flex justify-between items-center mb-4`}>
            <h1 className="text-2xl font-bold">Expense Tracker</h1>
            <button
              onClick={handleSignOut}
              className={`${styles.button} text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors`}
            >
              Sign Out
            </button>
          </div>

          {/* Total Expenses Card */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h2 className="text-lg font-semibold mb-2">Total Expenses</h2>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              className="mb-2 p-2 border rounded"
            >
              <option value="all-time">All Time</option>
              <option value="this-year">This Year</option>
              <option value="this-month">This Month</option>
            </select>
            {isTotalLoading ? (
              <div className={`${styles.card} ${styles.loader}`}>
                <div className={styles.words}>
                  <span className={styles.word}>Loading</span>
                  <span className={styles.word}>Loading</span>
                  <span className={styles.word}>Loading</span>
                  <span className={styles.word}>Loading</span>
                  <span className={styles.word}>Loading</span>
                </div>
              </div>
            ) : isTotalError ? (
              <p className="text-red-600">Error: {(totalError as Error).message}</p>
            ) : (
              <p className="text-3xl font-bold">${totalExpenses?.toFixed(2) || "0.00"}</p>
            )}
          </div>

          {/* Today's Total Expenses Card */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h2 className="text-lg font-semibold mb-2">Today&apos;s Total Expenses</h2>
            {isTodayLoading ? (
              <div className={`${styles.card} ${styles.loader}`}>
                <div className={styles.words}>
                  <span className={styles.word}>Loading</span>
                  <span className={styles.word}>Loading</span>
                  <span className={styles.word}>Loading</span>
                  <span className={styles.word}>Loading</span>
                  <span className={styles.word}>Loading</span>
                </div>
              </div>
            ) : isTodayError ? (
              <p className="text-red-600">Error: {(todayError as Error).message}</p>
            ) : (
              <p className="text-3xl font-bold">${todayExpenses?.toFixed(2) || "0.00"}</p>
            )}
          </div>

          <button
            onClick={() => setIsFormOpen(true)}
            className={`${styles.addButton} w-full text-white py-2 px-4 rounded-lg transition-colors`}
          >
            Add Expense
          </button>
          {isFormOpen && <ExpenseFormMobile onClose={() => setIsFormOpen(false)} />}
        </div>
      </div>
    </ErrorBoundary>
  )
}
