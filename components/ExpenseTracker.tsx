"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, signOut, getCurrentUser } from "@/lib/supabase"
import ExpenseFormMobile from "@/components/ExpenseFormMobile"
import { format, startOfYear, startOfMonth } from "date-fns"
import ErrorBoundary from "@/components/ErrorBoundary"
import { useRouter } from "next/navigation"
import styles from "./ExpenseTracker.module.css"

type Expense = {
  id: number
  date: string
  category_id: string
  description: string
  quantity: number
  unit: string
  amount: number
  supplier_id?: string
  note?: string
}

export default function ExpenseTracker() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [timePeriod, setTimePeriod] = useState("all-time")
  const [isEditing, setIsEditing] = useState<number | null>(null)
  const [formData, setFormData] = useState<Expense | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const router = useRouter()
  const queryClient = useQueryClient()
  const todayDate = format(new Date(), "MMMM dd, yyyy")

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
      const { data, error } = await supabase.from("expenses").select("*").eq("date", today)
      if (error) throw error
      return data
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  })

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todayExpenses"] })
      queryClient.invalidateQueries({ queryKey: ["totalExpenses"] })
    },
  })

  const updateExpenseMutation = useMutation({
    mutationFn: async (data: Expense) => {
      const { error } = await supabase.from("expenses").update(data).eq("id", data.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todayExpenses"] })
      queryClient.invalidateQueries({ queryKey: ["totalExpenses"] })
    },
  })

  const handleDelete = (id: number) => {
    deleteExpenseMutation.mutate(id)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData) {
      updateExpenseMutation.mutate(formData)
      setIsEditing(null)
      setFormData(null)
    }
  }

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
          <div className={`${styles.flipCard} mb-4`} onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`${styles.flipCardInner} ${isFlipped ? styles.flipped : ""}`}>
              <div className={styles.flipCardFront}>
                <h2 className={styles.title}>Today's {todayDate} Expenses</h2>
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
                  <p className="text-3xl font-bold">${todayExpenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0).toFixed(2) || "0.00"}</p>
                )}
              </div>
              <div className={styles.flipCardBack}>
                <h2 className={styles.title}>Today's {todayDate} Expenses</h2>
                <ul>
                  {todayExpenses?.map((expense: Expense) => (
                    <li key={expense.id} className="my-2">
                      {isEditing === expense.id ? (
                        <form onSubmit={handleSubmit} className="space-y-2 w-full">
                          <input
                            type="text"
                            name="description"
                            value={formData?.description || ""}
                            onChange={handleChange}
                            className="w-full border rounded px-2 py-1"
                          />
                          <input
                            type="number"
                            name="quantity"
                            value={formData?.quantity || 0}
                            onChange={handleChange}
                            className="w-full border rounded px-2 py-1"
                          />
                          <input
                            type="text"
                            name="unit"
                            value={formData?.unit || ""}
                            onChange={handleChange}
                            className="w-full border rounded px-2 py-1"
                          />
                          <input
                            type="number"
                            name="amount"
                            value={formData?.amount || 0}
                            onChange={handleChange}
                            className="w-full border rounded px-2 py-1"
                          />
                          <textarea
                            name="note"
                            value={formData?.note || ""}
                            onChange={handleChange}
                            className="w-full border rounded px-2 py-1"
                          />
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditing(null)
                                setFormData(null)
                              }}
                              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                              Save
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div>
                            <p>{expense.description}</p>
                            <p>
                              {expense.quantity} {expense.unit} - ${expense.amount.toFixed(2)}
                            </p>
                            {expense.note && <p className="text-sm text-gray-600">{expense.note}</p>}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setIsEditing(expense.id)
                                setFormData(expense)
                              }}
                              className="px-2 py-1 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="px-2 py-1 text-sm font-medium text-white bg-red-500 rounded hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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
